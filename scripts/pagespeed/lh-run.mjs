#!/usr/bin/env node
/**
 * Local Lighthouse runner for the /pagespeed skill.
 *
 * Runs Lighthouse N times per target against a locally served **production build**,
 * takes the median run, normalizes the result to a compact summary, appends to
 * `.pagespeed/history.jsonl`, and diffs against `.pagespeed/baseline.json`.
 *
 * Per target it writes two files into `.pagespeed/reports/`:
 *   <label>-<preset>.json      the compact summary (scores, metrics, opportunities)
 *   <label>-<preset>.lhr.json  the median run's full Lighthouse report — needed to trace a
 *                              finding to its cause (failing elements, console errors, the
 *                              request chain), which the summary deliberately omits.
 *
 *   node scripts/pagespeed/lh-run.mjs                                # tier1+tier2, mobile, 3 runs
 *   node scripts/pagespeed/lh-run.mjs --url=http://127.0.0.1:3000/ --runs=1
 *   node scripts/pagespeed/lh-run.mjs --tier=tier1 --preset=desktop
 *   node scripts/pagespeed/lh-run.mjs --baseline                     # also write baseline.json
 *
 * Flags: --url --tier=tier1,tier2 --preset=mobile|desktop --runs=N --baseline
 *        --targets=<file> --out=<dir> --chrome-path=<path> --allow-dev --json --quiet
 *        --warmup=N                discarded runs before the measured ones (default 2), so a
 *                                  cold Next.js compile isn't attributed to the page
 *        --unsafe-cookie-header    the ONLY switch that enables authenticated runs. Lighthouse's
 *                                  CLI has no cookie scoping, so the session is sent to every
 *                                  origin the page requests and lands in this process's argv —
 *                                  see runOnce(). Throwaway accounts and local targets only.
 *
 * Requires a Chrome/Chromium binary (see setup.md) and the `lighthouse` CLI — a local
 * devDependency if present, otherwise `npx -y lighthouse@12`.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

// ── args ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name, fallback = undefined) => {
  const hit = argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  return hit.includes("=") ? hit.slice(hit.indexOf("=") + 1) : true;
};

/** Numeric flag with validation — `--runs=abc` must be a flag error, not a stack trace
 *  from `medianRun([])` twenty lines later. */
const int = (name, fallback, min) => {
  const raw = flag(name, fallback);
  const n = raw === true ? fallback : Number(raw);
  if (!Number.isFinite(n)) die(`--${name} must be a number (got "${raw}")`);
  return Math.max(min, Math.trunc(n));
};

const OUT_DIR = resolve(String(flag("out", ".pagespeed")));
const TARGETS_FILE = resolve(String(flag("targets", "pagespeed-targets.json")));
const PRESET = String(flag("preset", "mobile"));
const RUNS = int("runs", 3, 1);
const WRITE_BASELINE = flag("baseline", false) === true;
const ALLOW_DEV = flag("allow-dev", false) === true;
// See runOnce(): Lighthouse's only CLI auth mechanism leaks cookies cross-origin, so it's opt-in.
const ALLOW_COOKIE_HEADER = flag("unsafe-cookie-header", false) === true;
const WARMUP = int("warmup", 2, 0);
const JSON_ONLY = flag("json", false) === true;
const QUIET = flag("quiet", false) === true || JSON_ONLY;
const CHROME_PATH = flag("chrome-path", process.env.CHROME_PATH);

if (!["mobile", "desktop"].includes(PRESET)) die(`--preset must be mobile|desktop (got "${PRESET}")`);

const log = (...a) => { if (!QUIET) console.log(...a); };
function die(msg) { console.error(`✗ ${msg}`); process.exit(1); }
const isUrl = (s) => { try { new URL(s); return true; } catch { return false; } };

// ── targets ──────────────────────────────────────────────────────────────────
function resolveTargets() {
  const single = flag("url");
  if (typeof single === "string") {
    // A scheme-less `127.0.0.1:3000/` otherwise fails later as "cannot reach … is the
    // production server running?", which sends you after the wrong problem. So does
    // `https://` with no host, which passes the scheme test, so parse it too. The same check
    // is in console-check.mjs and psi.mjs.
    if (!/^https?:\/\//i.test(single) || !isUrl(single)) {
      die(`--url must be an absolute http(s) URL (got "${single}")`);
    }
    // Include host:port in an ad-hoc label. Without it, `--url=…:3001/` and the tier1
    // homepage both key as "home" and the ad-hoc run silently overwrites the real
    // baseline and report for a *different* server.
    return [{ url: single, label: adhocLabel(single), tier: "adhoc" }];
  }

  if (!existsSync(TARGETS_FILE)) {
    die(`no --url given and no targets file at ${TARGETS_FILE}.\n` +
        `  Create one (see the skill's targets.md) or pass --url=http://127.0.0.1:3000/`);
  }
  const cfg = JSON.parse(readFileSync(TARGETS_FILE, "utf8"));
  const origin = (cfg.origins?.local ?? "http://127.0.0.1:3000").replace(/\/$/, "");
  const tiers = String(flag("tier", "tier1,tier2")).split(",").map((t) => t.trim()).filter(Boolean);

  const targets = [];
  for (const tier of tiers) {
    for (const entry of cfg[tier] ?? []) {
      const path = entry.path ?? entry;
      targets.push({
        url: /^https?:\/\//.test(path) ? path : origin + path,
        label: slug(entry.label ?? labelFromUrl(path)),
        tier,
        storageState: entry.storageState,
      });
    }
  }
  if (!targets.length) die(`no targets found for tier(s) ${tiers.join(", ")} in ${TARGETS_FILE}`);
  return targets;
}

const labelFromUrl = (u) => {
  const path = u.replace(/^https?:\/\/[^/]+/, "").replace(/\/$/, "") || "/";
  return path === "/" ? "home" : path.replace(/^\//, "").replace(/\//g, "-");
};

const safeHost = (u) => { try { return new URL(u).host; } catch { return "unknown-host"; } };

/** Labels reach here from a hand-written targets file and are used as filenames. A label
 *  containing `/` (e.g. "active-employees/dental") would write into a directory that
 *  doesn't exist and throw; `..` would escape OUT_DIR. Slug once, use everywhere, so the
 *  report filename and the baseline key can never disagree. */
const slug = (s) =>
  String(s).normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/^[-.]+|[-.]+$/g, "").slice(0, 80) || "unnamed";

/** Ad-hoc label for `--url`. Must match psi.mjs exactly, like everything else in this block.
 *
 *  Budget the 80-char cap so the HOST always survives. `slug(path + "-" + host)` truncates the
 *  joined string from the right, so any path over ~80 chars — an ordinary blog or docs URL —
 *  sliced the host straight back off, silently undoing the host-qualification it was added for
 *  (1.6.3) and letting an ad-hoc run overwrite a different server's report again. Truncating a
 *  derived value has to be budgeted at the point the parts are joined, not after. */
const adhocLabel = (u) => {
  const host = slug(safeHost(u)).slice(0, 40);
  const path = slug(labelFromUrl(u)).slice(0, Math.max(1, 80 - host.length - 1));
  return slug(`${path}-${host}`);
};


// ── lighthouse invocation ────────────────────────────────────────────────────
function lighthouseCommand() {
  const local = resolve("node_modules/.bin/lighthouse");
  if (existsSync(local)) return { cmd: local, pre: [] };
  return { cmd: "npx", pre: ["-y", "lighthouse@12"] };
}

/**
 * Fetch, retrying once on a connection-level failure.
 *
 * Lighthouse runs through `spawnSync`, which blocks this process's event loop for the
 * entire run — tens of seconds per run, minutes per target. Meanwhile the server closes
 * the idle keep-alive socket from the previous target (Node's default `keepAliveTimeout`
 * is 5s), but a blocked loop cannot process the FIN, so undici's pool still believes the
 * socket is live and hands it to the next request, which dies with `ECONNRESET`.
 *
 * The symptom was badly misleading: every target after the first reported "cannot reach —
 * is the production server running?" against a server that was serving 200s the whole
 * time, and the run aborted partway through a multi-page audit.
 *
 * `Connection: close` does **not** fix it (measured) — the poisoned socket is already
 * pooled before the header can matter. One retry does: the failed attempt evicts the dead
 * socket, so the retry opens a fresh connection. A *timeout* is never retried — that means
 * the server really isn't answering, and papering over it would hide a real failure.
 */
/**
 * Only these deserve a second attempt. Retrying every rejection hides permanent faults: Node
 * reports a malformed URL as `TypeError` with `cause.code === "ERR_INVALID_URL"`, and retrying
 * that just produces the same wrong answer half a second later.
 */
const TRANSIENT_CODES = new Set([
  "ECONNRESET",                 // the dead pooled socket this function exists for
  "EPIPE",
  "UND_ERR_SOCKET",             // undici: socket closed mid-request
  "ERR_STREAM_PREMATURE_CLOSE",
]);
// NOT here: `ETIMEDOUT`. It was, and it contradicted this function's own stated rule two
// paragraphs up — a timeout means the server isn't answering, and retrying papers over a real
// failure. The `err.name === "TimeoutError"` guard below catches the AbortSignal deadline but
// not an OS-level connect timeout, so the set was the only thing deciding that case, and it
// decided it the wrong way. Every other code here is a *connection* fault, where the retry
// exists to evict a poisoned socket.

async function fetchResilient(url, { timeoutMs = 30_000, ...init } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      // A fresh signal per attempt: a reused AbortSignal.timeout would already be spent.
      return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    } catch (err) {
      const code = err?.code ?? err?.cause?.code;
      // A timeout means the server genuinely isn't answering — never retry past it.
      if (err?.name === "TimeoutError" || attempt >= 2 || !TRANSIENT_CODES.has(code)) throw err;
    }
  }
}

/**
 * Warm the route before measuring. A framework's first request per route does real work
 * (render, ISR fill, cache population) that no real user pays for on a warm server, and a
 * cold first run can be catastrophically worse than steady state — far outside the
 * steady-state noise floor. Measured cold: perf 60 / LCP 8.6s; warm: perf 100 / LCP 1.7s
 * on the same page and build.
 */
async function warmup(url, times = WARMUP) {
  for (let i = 0; i < times; i++) {
    // Bounded: spawnSync's timeout covers Lighthouse, not these fetches, so an
    // accepts-but-never-answers server would hang the script with no output at all.
    try {
      await (await fetchResilient(url, { redirect: "follow" })).text();
    } catch { /* surfaced by the guard below */ }
  }
}

/** Guard the #1 mistake in this domain: measuring a dev server. */
async function assertNotDevServer(url) {
  let html = "";
  try {
    const res = await fetchResilient(url, { redirect: "follow" });
    // Without this check a 500/404 error page passes every dev-marker test and gets
    // measured as if it were the target — a plausible score for the wrong page.
    if (!res.ok) {
      die(`${url} returned HTTP ${res.status} ${res.statusText}.\n` +
          `  Measuring an error page produces a meaningless score. Fix the server or the URL first.`);
    }
    html = await res.text();
  } catch (err) {
    if (err?.name === "TimeoutError") die(`${url} accepted the connection but did not respond within 30s.`);
    die(`cannot reach ${url} — is the production server running? (\`build\` then \`start\`)`);
  }
  if (ALLOW_DEV) return;

  // Marker choice matters: the obvious ones (react-refresh, webpack-hmr) are absent from a
  // modern Turbopack dev server, and "turbopack" alone appears in PRODUCTION html too.
  // The reliable tells are the dev-overlay bundle and source-path-shaped chunk names —
  // a production build emits opaque hashed names, never `app_layout_tsx_…`.
  const devMarkers = [
    "next-devtools",          // Next dev overlay (15.3+/16)
    "next_dist_client",       // unbundled framework client code
    "react-refresh",          // webpack-based dev / Vite React plugin
    "webpack-hmr",
    "/@vite/client",          // Vite dev
    "__nextjs_original-stack-frame",
  ];
  const hit = devMarkers.find((m) => html.includes(m)) ??
    (/src="[^"]*\/chunks\/[^"]*_(tsx|jsx|ts|js)_[^"]*"/.test(html) ? "source-path-shaped chunk names" : undefined);

  if (hit) {
    die(`${url} looks like a DEV server (found "${hit}").\n` +
        `  Dev builds are unminified and unbundled — their Lighthouse scores are fiction.\n` +
        `  Run a production build instead (\`build\` + \`start\`), or pass --allow-dev to override.`);
  }
}

function runOnce(url, { storageState } = {}) {
  const outFile = join(tmpdir(), `lh-${process.pid}-${Math.floor(performance.now())}.json`);
  const { cmd, pre } = lighthouseCommand();
  const args = [
    ...pre,
    url,
    "--quiet",
    "--output=json",
    `--output-path=${outFile}`,
    "--only-categories=performance,accessibility,best-practices,seo",
    `--chrome-flags=--headless=new --no-sandbox --disable-gpu --disable-extensions`,
    "--max-wait-for-load=45000",
  ];
  if (PRESET === "desktop") args.push("--preset=desktop");

  // Auth'd measurement is OPT-IN because the only mechanism Lighthouse's CLI offers is unsafe.
  // `--extra-headers` becomes `Network.setExtraHTTPHeaders`, which attaches the header to
  // EVERY request the page makes — with no cookie scoping at all. So a session cookie would
  // also be sent to analytics, font, and captcha origins the page happens to load, and the
  // serialized value additionally shows up in this process's argv (visible to `ps`).
  // Host-scoping the cookies (below) fixes which cookies we *select*, not where Chrome sends
  // them, so it does not make this safe. A correct implementation drives Lighthouse
  // programmatically against a Playwright/Puppeteer context with a real cookie jar, which
  // preserves domain/path/Secure/SameSite — that isn't built yet.
  if (storageState) {
    if (!ALLOW_COOKIE_HEADER) {
      die(`refusing to send session cookies for ${url}.\n` +
          `  Lighthouse's --extra-headers sends the Cookie header to EVERY origin the page\n` +
          `  requests (analytics, fonts, captcha…), not just ${new URL(url).host}, and the value\n` +
          `  lands in this process's arguments. That leaks a real session.\n` +
          `  If the target is a throwaway/test account and you accept that, re-run with\n` +
          `  --unsafe-cookie-header. Otherwise measure an unauthenticated route.`);
    }
    log(`  ⚠ --unsafe-cookie-header: cookies will be sent to every origin this page requests`);
    args.push(`--extra-headers=${JSON.stringify(storageStateToHeaders(storageState, url))}`);
  }

  const env = { ...process.env };
  if (CHROME_PATH && CHROME_PATH !== true) env.CHROME_PATH = String(CHROME_PATH);

  const res = spawnSync(cmd, args, { env, encoding: "utf8", timeout: 180_000, stdio: ["ignore", "pipe", "pipe"] });
  if (res.error) die(`failed to launch Lighthouse (${cmd}): ${res.error.message}`);
  if (!existsSync(outFile)) {
    die(`Lighthouse produced no report for ${url}.\n${(res.stderr || res.stdout || "").trim().slice(-1200)}`);
  }
  const lhr = JSON.parse(readFileSync(outFile, "utf8"));
  rmSync(outFile, { force: true });
  return lhr;
}

/**
 * Cookies from a Playwright storageState → a Cookie header, for auth'd pages.
 *
 * Scoped to the target URL on purpose. A storageState file routinely holds cookies for
 * several domains (the app, an auth provider, analytics), and blindly concatenating all of
 * them would send unrelated session credentials to whatever host the target points at —
 * including a third-party or staging domain listed as an absolute URL in the targets file.
 * Match host and path the way a browser would, drop expired ones, and never send a Secure
 * cookie over plain http.
 */
function storageStateToHeaders(statePath, targetUrl) {
  if (!existsSync(statePath)) die(`storageState file not found: ${statePath}`);
  const state = JSON.parse(readFileSync(statePath, "utf8"));

  let target;
  try { target = new URL(targetUrl); } catch { die(`invalid target URL: ${targetUrl}`); }
  const nowSec = Date.now() / 1000;

  // The leading dot is the host-only/domain discriminator and must be preserved, not
  // stripped. Per RFC 6265, a cookie set WITHOUT a Domain attribute is host-only and matches
  // the exact host only; Chrome/CDP (and therefore a Playwright storageState) records those
  // with a bare domain and domain-scoped cookies with a leading ".". Normalizing the dot away
  // would let a cookie for `app.example.com` be sent to `preview.app.example.com` — the same
  // over-broad credential sending this function exists to prevent.
  const domainMatches = (cookieDomain) => {
    if (!cookieDomain) return false;
    const host = target.hostname.toLowerCase();
    const raw = cookieDomain.toLowerCase();
    if (!raw.startsWith(".")) return host === raw;      // host-only
    const d = raw.slice(1);
    return host === d || host.endsWith(`.${d}`);        // domain cookie: covers subdomains
  };
  const pathMatches = (cookiePath) => {
    const p = cookiePath || "/";
    return target.pathname === p || target.pathname.startsWith(p.endsWith("/") ? p : `${p}/`);
  };

  const applicable = (state.cookies ?? []).filter((c) => {
    if (!domainMatches(c.domain)) return false;
    if (!pathMatches(c.path)) return false;
    if (typeof c.expires === "number" && c.expires > 0 && c.expires < nowSec) return false;
    if (c.secure && target.protocol !== "https:") return false;
    return true;
  });

  const skipped = (state.cookies ?? []).length - applicable.length;
  if (skipped > 0) log(`  (storageState: sent ${applicable.length} cookie(s), skipped ${skipped} not scoped to ${target.host})`);
  if (!applicable.length) {
    log(`  ⚠ no cookies in ${statePath} apply to ${target.host} — this run will measure the UNAUTHENTICATED page`);
  }

  const cookie = applicable.map((c) => `${c.name}=${c.value}`).join("; ");
  return cookie ? { Cookie: cookie } : {};
}

// ── normalize ────────────────────────────────────────────────────────────────
const num = (lhr, id) => lhr.audits?.[id]?.numericValue ?? null;
const score = (lhr, cat) => {
  const s = lhr.categories?.[cat]?.score;
  return s === null || s === undefined ? null : Math.round(s * 100);
};

function summarize(lhr, target) {
  // Savings come from `metricSavings` (present on every audit since LH 10), NOT from
  // `details.overallSavingsMs`. Lighthouse 12 moved much of its diagnostic surface to
  // new `*-insight` audits whose details are plain tables — filtering on
  // details.type === "opportunity" silently misses all of them.
  // `metricSavings` is optional in the LHR type (diagnostics like `total-byte-weight` have
  // none), so don't require it — an audit qualifies on time savings OR byte savings.
  const opportunities = Object.values(lhr.audits ?? {})
    .filter((a) => a.score !== null && a.score < 1)
    .map((a) => {
      const ms = a.metricSavings ?? {};
      return {
        id: a.id,
        title: a.title,
        savingsMs: Math.round(Math.max(ms.LCP ?? 0, ms.FCP ?? 0, ms.TBT ?? 0)),
        lcpMs: Math.round(ms.LCP ?? 0),
        tbtMs: Math.round(ms.TBT ?? 0),
        savingsBytes: Math.round(a.details?.overallSavingsBytes ?? 0),
      };
    })
    .filter((o) => o.savingsMs >= 50 || o.savingsBytes >= 20_480)
    .sort((x, y) => y.savingsMs - x.savingsMs)
    .slice(0, 10);

  const failed = {};
  for (const cat of ["performance", "accessibility", "best-practices", "seo"]) {
    failed[cat] = (lhr.categories?.[cat]?.auditRefs ?? [])
      .map((ref) => lhr.audits?.[ref.id])
      .filter((a) => a && a.score !== null && a.score < 0.9 &&
        !["notApplicable", "informative", "manual"].includes(a.scoreDisplayMode))
      .map((a) => ({ id: a.id, title: a.title, score: a.score }));
  }

  return {
    label: target.label,
    tier: target.tier,
    url: target.url,
    finalUrl: lhr.finalDisplayedUrl ?? lhr.finalUrl ?? target.url,
    preset: PRESET,
    lighthouseVersion: lhr.lighthouseVersion,
    fetchTime: lhr.fetchTime,
    scores: {
      performance: score(lhr, "performance"),
      accessibility: score(lhr, "accessibility"),
      bestPractices: score(lhr, "best-practices"),
      seo: score(lhr, "seo"),
    },
    metrics: {
      lcpMs: round(num(lhr, "largest-contentful-paint")),
      fcpMs: round(num(lhr, "first-contentful-paint")),
      cls: roundTo(num(lhr, "cumulative-layout-shift"), 3),
      tbtMs: round(num(lhr, "total-blocking-time")),
      ttfbMs: round(num(lhr, "server-response-time")),
      speedIndexMs: round(num(lhr, "speed-index")),
      totalBytes: round(num(lhr, "total-byte-weight")),
    },
    lcpElement: lhr.audits?.["largest-contentful-paint-element"]?.details?.items?.[0]?.items?.[0]?.node?.snippet ?? null,
    opportunities,
    failedAudits: failed,
    runtimeError: lhr.runtimeError?.code ?? null,
    runWarnings: lhr.runWarnings ?? [],
  };
}

const round = (v) => (v === null || v === undefined ? null : Math.round(v));
const roundTo = (v, d) => (v === null || v === undefined ? null : Number(v.toFixed(d)));
// delta() yields null per field when a metric is absent on either side, and `null > 0` is
// false — so an unguarded template renders the string "null", which reads as a measured
// value. Same rule as delta() itself: absent is unknown, never zero and never a number.
const signed = (n) => {
  if (n === null || n === undefined) return "n/a";
  return n > 0 ? `+${n}` : `${n}`;
};
const kb = (b) => `${Math.round(b / 1024)}KB`;

/** Median by performance score — returns a whole coherent run, not blended metrics. */
function medianRun(summaries) {
  const sorted = [...summaries].sort((a, b) => (a.scores.performance ?? 0) - (b.scores.performance ?? 0));
  return sorted[Math.floor(sorted.length / 2)];
}

// ── noise floor ──────────────────────────────────────────────────────────────
const NOISE = { perf: 5, lcpPct: 10, cls: 0.05 };

/** A missing metric is UNKNOWN, not zero. Coercing `null` to 0 turns "we have no baseline
 *  LCP" into "LCP got 3200ms worse" — a fabricated delta that can read as a real
 *  regression or mask one. Absent on either side → that field's delta is null. */
function delta(now, before) {
  if (!before) return null;
  const diff = (a, b) => (a === null || a === undefined || b === null || b === undefined ? null : a - b);

  const dPerf = diff(now.scores.performance, before.scores.performance);
  const dLcp = diff(now.metrics.lcpMs, before.metrics.lcpMs);
  const dCls = diff(now.metrics.cls, before.metrics.cls);
  const lcpPct = dLcp !== null && before.metrics.lcpMs ? (dLcp / before.metrics.lcpMs) * 100 : null;

  const exceeds = (v, limit) => v !== null && Math.abs(v) > limit;
  const meaningful =
    exceeds(dPerf, NOISE.perf) || exceeds(lcpPct, NOISE.lcpPct) || exceeds(dCls, NOISE.cls);

  return { dPerf, dLcp, dCls: dCls === null ? null : roundTo(dCls, 3), meaningful };
}

// ── main ─────────────────────────────────────────────────────────────────────
const targets = resolveTargets();
mkdirSync(join(OUT_DIR, "reports"), { recursive: true });

const baselinePath = join(OUT_DIR, "baseline.json");
const baseline = existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, "utf8")) : {};
const results = [];

for (const target of targets) {
  await assertNotDevServer(target.url);
  log(`\n▸ ${target.label} (${target.tier}) — ${PRESET} — ${RUNS} run${RUNS > 1 ? "s" : ""}`);
  log(`  ${target.url}`);
  if (WARMUP) await warmup(target.url);

  const runs = [];
  const raws = [];
  for (let i = 0; i < RUNS; i++) {
    const lhr = runOnce(target.url, target);
    const s = summarize(lhr, target);
    runs.push(s);
    raws.push(lhr);
    log(`  run ${i + 1}: perf ${s.scores.performance} · a11y ${s.scores.accessibility} · ` +
        `bp ${s.scores.bestPractices} · seo ${s.scores.seo} · LCP ${s.metrics.lcpMs}ms`);
  }

  const median = medianRun(runs);
  median.runCount = RUNS;
  const perfs = runs.map((r) => r.scores.performance ?? 0);
  const lcps = runs.map((r) => r.metrics.lcpMs ?? 0);
  median.spread = {
    performance: [Math.min(...perfs), Math.max(...perfs)],
    lcpMs: [Math.min(...lcps), Math.max(...lcps)],
  };

  // A wide spread means the machine, not the page, is being measured. Say so — a median
  // over unstable runs is a precise-looking number with no meaning.
  const perfSpread = Math.max(...perfs) - Math.min(...perfs);
  if (RUNS > 1 && perfSpread > 10) {
    median.unstable = true;
    log(`  ⚠ perf spread ${perfSpread} points across ${RUNS} runs — the environment is unstable.`);
    log(`    Close other CPU-heavy work and re-run; don't attribute deltas until the spread is <10.`);
  }
  if (RUNS === 1) log(`  ⚠ single run — no variance information. Use --runs=3 before drawing conclusions.`);

  if (median.finalUrl.replace(/\/$/, "") !== target.url.replace(/\/$/, "")) {
    log(`  ⚠ redirected to ${median.finalUrl} — this measures a DIFFERENT page than requested`);
    median.redirected = true;
  }
  if (median.runtimeError) log(`  ⚠ runtime error: ${median.runtimeError}`);

  const key = `${median.label}|${PRESET}`;
  const d = delta(median, baseline[key]);
  if (d) {
    log(`  vs baseline: perf ${signed(d.dPerf)} · ` +
        `LCP ${d.dLcp === null ? "n/a" : `${signed(d.dLcp)}ms`} · CLS ${signed(d.dCls)}` +
        `  → ${d.meaningful ? "MEANINGFUL" : "within noise floor"}`);
  }
  median.deltaVsBaseline = d;

  // A baseline is the reference every later comparison is measured against, so it must not
  // be seeded from a run this script has itself just called meaningless. Otherwise real
  // regressions read as "within noise floor" forever after. `--baseline` still overrides.
  // A single run counts as meaningless too: `unstable` needs a spread, so it is never set
  // when RUNS is 1, and one outlier would become the reference for every later comparison.
  const trustworthy = RUNS > 1 && !median.unstable && !median.redirected && !median.runtimeError;
  if (!trustworthy && !baseline[key]) {
    log(`  ⚠ not seeding a baseline from this run (${[
      RUNS === 1 && "single run", median.unstable && "unstable spread", median.redirected && "redirected",
      median.runtimeError && "runtime error",
    ].filter(Boolean).join(", ")}). Fix the cause and re-run, or force with --baseline.`);
  }

  writeFileSync(join(OUT_DIR, "reports", `${median.label}-${PRESET}.json`), JSON.stringify(median, null, 2));

  // Keep the median run's FULL Lighthouse report, not just the normalized summary.
  // The summary lists audit ids and scores, which is enough to say *what* failed and
  // nothing about *why*: `color-contrast` without `details.items` doesn't name the element,
  // and `errors-in-console` doesn't quote the error. Principle 4 of this skill is "fix
  // causes, not audit rows" — without `details` that's unachievable, and diagnosing means
  // re-running Lighthouse by hand. Written per target (a few MB); `.pagespeed/` is gitignored.
  const medianRaw = raws[runs.indexOf(median)];
  if (medianRaw) {
    writeFileSync(join(OUT_DIR, "reports", `${median.label}-${PRESET}.lhr.json`),
      JSON.stringify(medianRaw));
  }
  appendFileSync(join(OUT_DIR, "history.jsonl"),
    JSON.stringify({ at: new Date().toISOString(), source: "lighthouse", ...stripVerbose(median) }) + "\n");

  if (WRITE_BASELINE || (!baseline[key] && trustworthy)) baseline[key] = stripVerbose(median);
  results.push(median);

  if (median.opportunities.length) {
    log(`  top opportunities:`);
    for (const o of median.opportunities.slice(0, 5)) {
      log(`    · ${o.title} — ~${o.savingsMs}ms` + (o.savingsBytes ? `, ${kb(o.savingsBytes)}` : ""));
    }
  }
  const failCount = Object.values(median.failedAudits).flat().length;
  if (failCount) log(`  ${failCount} failing audit(s) — see ${OUT_DIR}/reports/${median.label}-${PRESET}.json`);
}

writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));

function stripVerbose(s) {
  const { failedAudits, opportunities, ...rest } = s;
  return { ...rest, opportunityCount: opportunities.length, failedAuditCount: Object.values(failedAudits).flat().length };
}

if (JSON_ONLY) {
  console.log(JSON.stringify(results, null, 2));
} else {
  console.log(`\n${"Page".padEnd(22)}${"Perf".padEnd(7)}${"A11y".padEnd(7)}${"BP".padEnd(7)}${"SEO".padEnd(7)}${"LCP".padEnd(9)}${"CLS".padEnd(8)}TBT`);
  for (const r of results) {
    console.log(
      String(r.label).slice(0, 21).padEnd(22) +
      String(r.scores.performance ?? "-").padEnd(7) +
      String(r.scores.accessibility ?? "-").padEnd(7) +
      String(r.scores.bestPractices ?? "-").padEnd(7) +
      String(r.scores.seo ?? "-").padEnd(7) +
      `${r.metrics.lcpMs ?? "-"}ms`.padEnd(9) +
      String(r.metrics.cls ?? "-").padEnd(8) +
      `${r.metrics.tbtMs ?? "-"}ms`
    );
  }
  console.log(`\nmedian of ${RUNS} run(s) · preset ${PRESET} · noise floor ±${NOISE.perf} perf / ±${NOISE.lcpPct}% LCP`);
  console.log(`reports: ${OUT_DIR}/reports · history: ${OUT_DIR}/history.jsonl`);
}
