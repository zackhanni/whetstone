#!/usr/bin/env node
/**
 * Browser console / runtime-error checker for the /pagespeed skill.
 *
 * Opens each target in a real Chromium and records what the DEVTOOLS CONSOLE would show:
 * console errors and warnings, uncaught exceptions, failed requests, and CSP violations.
 *
 *   node scripts/pagespeed/console-check.mjs                       # tier1+tier2, local
 *   node scripts/pagespeed/console-check.mjs --deployed            # against the deployed origin
 *   node scripts/pagespeed/console-check.mjs --url=https://x.dev/  # one page
 *
 * Flags: --url --tier=tier1,tier2 --deployed --targets=<file> --out=<dir> --settle=<ms>
 *        --json --quiet --all (include info/log level too)
 *
 * WHY THIS EXISTS — Lighthouse is not a substitute:
 *   * `errors-in-console` reports **errors only**. Chrome's "preloaded but not used" notice is a
 *     *warning*, so Lighthouse scores 100 on a page that is wasting a high-priority request.
 *   * Lighthouse stops observing early. Anything logged after its load window — a blocked
 *     third-party script, a late CSP violation, a hydration warning — is invisible to it.
 *   * A blocked or 404'd script is a one-line console entry and a multi-hundred-KB story; the
 *     audit row says "Browser errors were logged" and names neither.
 *   * Console output distinguishes LOCAL-ONLY noise from real production faults, which a local
 *     Lighthouse run structurally cannot (checklist X7).
 * Real finding this caught that a full Lighthouse audit missed: a CSP-blocked platform script
 * erroring on every production page load, plus a font preloaded on every route and never used.
 *
 * KNOWN LIMITS — headless is not the developer's browser. Verified against a real site:
 *   * **Browser-generated notices don't all arrive.** Chrome's "preloaded but not used" notice
 *     is a DevTools *issue*, not a page console call, so it does NOT come through CDP and this
 *     script cannot see it. Same for several intervention/deprecation notices. If a human
 *     reports a console message this script doesn't reproduce, believe the human.
 *   * **Platform overlays are login-gated.** Vercel's toolbar/feedback script is injected only
 *     for authenticated team members, so a CSP violation it triggers appears in *your* console
 *     and never in headless — or for real users. Useful signal: if only a logged-in teammate
 *     sees an error, it is not affecting visitors.
 *   * No extensions and **no logged-in session at all** — this script loads no Playwright
 *     `storageState`, and `--url` provides no way to supply one. The `auth` tier is refused
 *     outright rather than silently measured anonymously (see resolveTargets). Authenticated
 *     console checking is not supported yet; don't read a clean anonymous run as covering it.
 * So: this catches what real anonymous visitors hit. It is a complement to a human opening
 * DevTools, not a replacement.
 *
 * Requires Playwright (`@playwright/test` or `playwright`) with Chromium installed:
 *   pnpm add -D @playwright/test && pnpm exec playwright install chromium
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const argv = process.argv.slice(2);
const flag = (name, fallback = undefined) => {
  const hit = argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  return hit.includes("=") ? hit.slice(hit.indexOf("=") + 1) : true;
};

const OUT_DIR = resolve(String(flag("out", ".pagespeed")));
const TARGETS_FILE = resolve(String(flag("targets", "pagespeed-targets.json")));
const DEPLOYED = flag("deployed", false) === true;
const JSON_ONLY = flag("json", false) === true;
const QUIET = flag("quiet", false) === true || JSON_ONLY;
const ALL_LEVELS = flag("all", false) === true;

const log = (...a) => { if (!QUIET) console.log(...a); };
function die(msg) { console.error(`✗ ${msg}`); process.exit(1); }

const int = (name, fallback, min) => {
  const raw = flag(name, fallback);
  const n = raw === true ? fallback : Number(raw);
  if (!Number.isFinite(n)) die(`--${name} must be a number (got "${raw}")`);
  return Math.max(min, Math.trunc(n));
};
// Console output arrives asynchronously and often AFTER load — a CSP violation from a
// deferred third-party script, a late warning. Settling too early is how these get missed.
const SETTLE_MS = int("settle", 6000, 0);

async function loadChromium() {
  for (const pkg of ["@playwright/test", "playwright", "playwright-core"]) {
    try {
      const m = await import(pkg);
      if (m.chromium) return m.chromium;
    } catch { /* try the next one */ }
  }
  die(
    "Playwright not found. Install it:\n" +
    "    pnpm add -D @playwright/test && pnpm exec playwright install chromium\n" +
    "  (this check needs a real browser — Lighthouse alone reports errors only, not warnings)");
}

// The same four helpers as lh-run.mjs and psi.mjs, and they must stay identical: a label is
// how a page's console report is joined to its Lighthouse and PSI reports. This file used a
// bare "adhoc" for every `--url` run, so each run overwrote `adhoc-console.json` from the one
// before — across different hosts — and its label matched nothing the other two runners wrote.
const labelFromUrl = (u) => {
  const path = u.replace(/^https?:\/\/[^/]+/, "").replace(/\/$/, "") || "/";
  return path === "/" ? "home" : path.replace(/^\//, "").replace(/\//g, "-");
};

const slug = (s) =>
  String(s).normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/^[-.]+|[-.]+$/g, "").slice(0, 80) || "unnamed";

const safeHost = (u) => { try { return new URL(u).host; } catch { return "unknown-host"; } };

/** Ad-hoc label for `--url`. Must match lh-run.mjs and psi.mjs exactly.
 *
 *  Budget the 80-char cap so the HOST always survives. `slug(path + "-" + host)` truncates the
 *  joined string from the right, so any path over ~80 chars — an ordinary blog or docs URL —
 *  sliced the host straight back off, letting two deployments of that page overwrite one
 *  report. Truncating a derived value has to be budgeted at the point the parts are joined. */
const adhocLabel = (u) => {
  const host = slug(safeHost(u)).slice(0, 40);
  const path = slug(labelFromUrl(u)).slice(0, Math.max(1, 80 - host.length - 1));
  return slug(`${path}-${host}`);
};

function resolveTargets() {
  const single = flag("url");
  if (typeof single === "string") {
    // A scheme-less `example.com` fails navigation and then crashes `new URL()` below, before
    // the browser is closed.
    if (!/^https?:\/\//i.test(single) || !isUrl(single)) {
      die(`--url must be an absolute http(s) URL (got "${single}")`);
    }
    return [{ label: adhocLabel(single), tier: "adhoc", url: single }];
  }
  if (!existsSync(TARGETS_FILE)) die(`no targets file at ${TARGETS_FILE} (see targets.md)`);
  const cfg = JSON.parse(readFileSync(TARGETS_FILE, "utf8"));
  const origin = DEPLOYED ? cfg.origins?.deployed : cfg.origins?.local;
  if (!origin) die(`targets file has no origins.${DEPLOYED ? "deployed" : "local"}`);
  const tiers = String(flag("tier", "tier1,tier2")).split(",").map((t) => t.trim()).filter(Boolean);

  // Auth targets carry a Playwright `storageState` (see targets.md) that this script does not
  // load yet. Running one anonymously does not fail — the app redirects to /login and the
  // console of the LOGIN page is written under the portal's label, which is worse than an
  // error because the report looks valid. psi.mjs refuses the same tier for the same reason.
  if (tiers.includes("auth")) {
    die(`the "auth" tier needs a Playwright storageState, which this script does not load yet.\n` +
        `  The run would follow the login redirect and record it under the portal's label.\n` +
        `  Measure authenticated routes with lh-run.mjs --unsafe-cookie-header instead.`);
  }

  const out = [];
  for (const tier of tiers) {
    for (const t of cfg[tier] ?? []) {
      out.push({ label: t.label ?? t.path, tier, url: origin.replace(/\/$/, "") + t.path });
    }
  }
  if (!out.length) die(`no targets for tier(s) ${tiers.join(",")}`);
  return out;
}

const isUrl = (s) => { try { new URL(s); return true; } catch { return false; } };

/** Third-party noise is real but not YOUR bug — separate it so it can't drown the signal. */
function classify(url, pageOrigin) {
  if (!url) return "unknown";
  try {
    return new URL(url).origin === pageOrigin ? "first-party" : "third-party";
  } catch {
    return "unknown";
  }
}

const targets = resolveTargets();
const chromium = await loadChromium();
mkdirSync(join(OUT_DIR, "reports"), { recursive: true });

// CHROME_PATH (the same variable lh-run.mjs honors) runs an installed Chrome instead of
// Playwright's own build, so the check works when Playwright's browser download is missing or stale.
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const results = [];

for (const target of targets) {
  // NOTE: entries record only their `source` here; `party` is assigned AFTER navigation, from
  // `page.url()`. Classifying at capture time against `target.url` is wrong the moment the page
  // redirects — an apex→www hop makes the document's own origin "third-party", so every entry
  // is excused and the run exits 0 on a page full of your own errors. The listeners have to be
  // registered before `goto`, but the origin they compare against isn't known until it resolves.
  const page = await browser.newPage();
  const entries = [];

  const add = (e) => {
    // Identical messages repeat per occurrence; collapse them but keep a count so "fires on
    // every render" stays distinguishable from "fired once".
    //
    // `source` MUST be in the key. The exit contract at the bottom of this file fails the run
    // on first-party entries only, so collapsing a first-party and a third-party entry that
    // happen to share text would inherit whichever arrived first — either hiding a real failure
    // or failing on someone else's script. `party` is not in the key because it is not known
    // yet (see the note above the loop) — and it does not need to be: party is a pure function
    // of `source` and the final origin, so two entries with the same source always classify
    // the same way.
    const keyOf = (x) => `${x.kind}|${x.level}|${x.source ?? ""}|${x.text}`;
    const key = keyOf(e);
    const hit = entries.find((x) => keyOf(x) === key);
    if (hit) { hit.count++; return; }
    entries.push({ ...e, count: 1 });
  };

  page.on("console", (msg) => {
    const level = msg.type();
    if (!ALL_LEVELS && !["error", "warning"].includes(level)) return;
    const loc = msg.location();
    const text = msg.text().replace(/\s+/g, " ").trim();

    // A CSP violation is REPORTED by the document but CAUSED by the blocked resource, and the
    // init-script listener below logs it from the page context — so msg.location() is the
    // document either way. Classifying by that would mark every violation first-party, and a
    // blocked THIRD-PARTY script would then fail the run, contradicting the exit contract at
    // the bottom of this file. The blocked URI is already in the message; attribute to it.
    //
    // Only when it IS a URL, though. CSP3 defines sentinel values for violations with no
    // resource — `inline`, `eval`, `wasm-eval`, `trusted-types-policy`, `trusted-types-sink`
    // (plus this listener's own "(inline)" fallback) — and those are the DOCUMENT's own
    // violations. Handing a sentinel to classify() returns "unknown", which the exit check
    // does not count, so a real first-party CSP error would pass as success. Parse-or-document
    // covers every sentinel, including ones added to the spec after this was written.
    //
    // Chromium ALSO logs its own message for the same violation, through the same listener and
    // located at the document ("Loading the script '<url>' violates the following Content
    // Security Policy directive…"; older builds say "Refused to load…"). Attribute it to the
    // quoted URL too. CSP keywords are quoted but host sources are not, so the first quoted
    // http(s) URL is the blocked resource; an inline violation has none and stays the document's.
    const blocked =
      /^\[CSP\] blocked (\S+) /.exec(text)?.[1] ??
      (/Content Security Policy/.test(text) ? /'(https?:\/\/[^']+)'/.exec(text)?.[1] : undefined);
    const attributed = blocked && isUrl(blocked) ? blocked : loc?.url;

    add({
      kind: "console",
      level,
      text: text.slice(0, 400),
      source: attributed || null,
    });
  });

  // An uncaught exception is not a console.error — it arrives on a different channel and is
  // the most severe thing here, so it must never be filtered out with the noise.
  //
  // `page.on("pageerror")` carries no location, so this used to hard-code `first-party` — which
  // failed CI on any third-party script's exception. The stack's first URL is the throwing
  // script, so attribute to that when one is present.
  //
  // When it ISN'T present, the fallback stays **first-party**, deliberately. "unknown" is not
  // counted by the exit check, so defaulting there would let a genuine uncaught exception —
  // the most severe signal this script collects — pass as success. That is the same
  // silent-green the CSP sentinel fix (1.6.3) was written to close. An unattributable
  // exception is over-reported on purpose; the failure mode of the alternative is worse.
  page.on("pageerror", (err) => {
    // Excluding `:` from the class to stop before `:line:col` also ate the PORT:
    // `http://127.0.0.1:3000/app.js:10:2` yielded `http://127.0.0.1`, whose origin does not
    // match `http://127.0.0.1:3000`, so every localhost exception classified third-party —
    // and the exit check ignores third-party. Take everything up to whitespace or the stack
    // frame's `)`, then strip the one suffix V8 always appends: `:<line>:<column>`, both
    // present, together. A bare `http://host:3000` is left alone because it has only one.
    //
    // Search only the `at …` frame lines. The stack STARTS with "<Name>: <message>", so a URL
    // in the message ("request to https://api.vendor.com failed", thrown by your own code)
    // won over the first frame and marked a first-party exception third-party: exit 0.
    const frames = String(err?.stack ?? "").split("\n").filter((line) => /^\s+at /.test(line)).join("\n");
    const raw = /\bhttps?:\/\/[^\s)]+/.exec(frames)?.[0]?.replace(/:\d+:\d+$/, "");
    // A non-URL here would classify "unknown", which the exit check does not count — the same
    // silent-green the CSP sentinel guard above exists to close. Fall back rather than guess.
    const fromStack = raw && isUrl(raw) ? raw : null;
    add({ kind: "exception", level: "error", text: String(err?.message ?? err).slice(0, 400),
          source: fromStack ?? null, partyFallback: "first-party" });
  });

  page.on("requestfailed", (req) => {
    const err = req.failure()?.errorText ?? "failed";
    const url = req.url();

    // `net::ERR_ABORTED` is usually NORMAL, not a fault: the browser cancels in-flight
    // requests all the time — most visibly Next.js router prefetches (`?_rsc=`), which are
    // speculative by design and get aborted whenever they're no longer needed. Reporting
    // those as first-party errors made a healthy production page look broken (measured: 2
    // per load on a real site) and would fail CI on correct behaviour. A cancelled
    // *speculative* request is dropped; any other abort is downgraded to a warning, because
    // it can also mean a genuinely blocked request and shouldn't vanish silently.
    const aborted = /ERR_ABORTED/.test(err);
    const speculative = /[?&]_rsc=/.test(url) || req.resourceType?.() === "prefetch";
    if (aborted && speculative) return;

    add({ kind: "requestfailed", level: aborted ? "warning" : "error",
          text: `${err} — ${url.slice(0, 160)}`,
          source: url });
  });

  page.on("response", (res) => {
    if (res.status() >= 400) {
      add({ kind: "http", level: res.status() >= 500 ? "error" : "warning",
            text: `HTTP ${res.status()} — ${res.url().slice(0, 160)}`,
            source: res.url() });
    }
  });

  let navError = null;
  try {
    // CSP violations fire on the document, not always as console output — listen directly.
    await page.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (e) => {
        console.error(`[CSP] blocked ${e.blockedURI || "(inline)"} — violated ${e.violatedDirective}`);
      });
    });
    const res = await page.goto(target.url, { waitUntil: "load", timeout: 45_000 });
    if (res && !res.ok()) navError = `navigation returned HTTP ${res.status()}`;
    await page.waitForTimeout(SETTLE_MS);
  } catch (err) {
    navError = String(err?.message ?? err).slice(0, 200);
  }

  // Classify now, against the origin the browser actually ended on. `page.url()` is the
  // post-redirect URL once `goto` has resolved; if navigation threw outright, fall back to the
  // requested URL so entries captured before the failure are still attributed.
  // A navigation that fails before commit leaves the page on `about:blank`, which IS a URL but
  // has the origin "null" — so test for http(s), not for parseability.
  const current = (() => { try { return page.url(); } catch { return ""; } })();
  const finalUrl = /^https?:/i.test(current) ? current : target.url;
  const pageOrigin = new URL(finalUrl).origin;
  for (const e of entries) {
    e.party = e.source ? classify(e.source, pageOrigin) : (e.partyFallback ?? "unknown");
    delete e.partyFallback;
  }
  if (pageOrigin !== new URL(target.url).origin) {
    log(`  ↪ redirected to ${finalUrl} — attributing against ${pageOrigin}`);
  }

  await page.close();

  const errors = entries.filter((e) => e.level === "error");
  const warnings = entries.filter((e) => e.level === "warning");
  const firstParty = entries.filter((e) => e.party === "first-party");
  // Count each class explicitly. `entries.length - firstParty.length` folded "unknown" into the
  // third-party column, so an unattributable entry was silently reported as somebody else's
  // problem — the one bucket a reader skips.
  const thirdParty = entries.filter((e) => e.party === "third-party");
  const unknown = entries.filter((e) => e.party === "unknown");
  const summary = {
    label: target.label, tier: target.tier, url: target.url, finalUrl,
    checkedAt: new Date().toISOString(),
    navError,
    counts: {
      errors: errors.length, warnings: warnings.length,
      firstParty: firstParty.length, thirdParty: thirdParty.length, unknown: unknown.length,
    },
    entries,
  };
  results.push(summary);
  // slug(), not an inline regex: the filename and the label the other two runners write must
  // agree, or the three reports for one page cannot be joined.
  writeFileSync(join(OUT_DIR, "reports", `${slug(target.label)}-console.json`),
    JSON.stringify(summary, null, 2));

  log(`\n▸ ${target.label} (${target.tier})\n  ${target.url}`);
  if (navError) log(`  ⚠ ${navError}`);
  if (!entries.length) log(`  clean — no console errors or warnings`);
  for (const e of entries) {
    const tag = e.level === "error" ? "✗" : "⚠";
    log(`  ${tag} [${e.party}] ${e.text}${e.count > 1 ? `  (×${e.count})` : ""}`);
  }
}

await browser.close();

if (JSON_ONLY) {
  console.log(JSON.stringify(results, null, 2));
} else {
  console.log(`\n${"Page".padEnd(22)}${"Errors".padEnd(8)}${"Warnings".padEnd(10)}${"1st-party".padEnd(11)}${"3rd-party".padEnd(11)}Unknown`);
  for (const r of results) {
    console.log(String(r.label).slice(0, 21).padEnd(22) + String(r.counts.errors).padEnd(8) +
      String(r.counts.warnings).padEnd(10) + String(r.counts.firstParty).padEnd(11) +
      String(r.counts.thirdParty).padEnd(11) + r.counts.unknown);
  }
  console.log(`\nFirst-party entries are yours to fix. Third-party ones usually need the provider`);
  console.log(`scoped, deferred, or removed — you cannot patch their code.`);
  console.log(`reports: ${OUT_DIR}/reports/<label>-console.json`);
}

// Exit non-zero on FIRST-PARTY errors, or on a navigation failure. Third-party console noise is
// largely outside your control, so failing on it would make this unusable in CI — but a page
// that never loaded must not report success: "0 errors" on an unreachable page is the most
// dangerous possible green.
const firstPartyErrors = results.reduce(
  (n, r) => n + r.entries.filter((e) => e.level === "error" && e.party === "first-party").length, 0);
const navFailures = results.filter((r) => r.navError).length;
if (navFailures) console.error(`✗ ${navFailures} page(s) failed to load — see navError in the reports`);
// `process.exitCode`, not `process.exit()`. When stdout is a pipe rather than a TTY — `| tee`,
// `| head`, most CI log collectors — writes are asynchronous, and `process.exit()` tears the
// process down with them still queued. That truncates the very report and failure line a
// failing run exists to print. Setting the code lets Node drain and exit on its own.
process.exitCode = firstPartyErrors > 0 || navFailures > 0 ? 1 : 0;
