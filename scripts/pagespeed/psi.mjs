#!/usr/bin/env node
/**
 * PageSpeed Insights runner for the /pagespeed skill.
 *
 * Calls the public PSI API for the **deployed** URLs: Google's own Lighthouse lab run
 * plus **CrUX field data** (what real users actually experience — and what search
 * ranking uses). Normalized to the same shape as lh-run.mjs so one report template
 * covers both.
 *
 *   node scripts/pagespeed/psi.mjs                           # tier1+tier2, mobile
 *   node scripts/pagespeed/psi.mjs --url=https://example.com/ --strategy=desktop
 *   node scripts/pagespeed/psi.mjs --origin-only               # origin-level field data only
 *
 * Flags: --url --tier=tier1,tier2 --strategy=mobile|desktop --targets=<file>
 *        --out=<dir> --key=<api-key> --origin-only --json --quiet
 *
 * An API key is **effectively required**. Unkeyed requests share one global anonymous daily
 * quota that is routinely already exhausted, so "no field data" is usually "couldn't ask".
 * Resolved from `--key`, then `$PSI_API_KEY` / `$PAGE_SPEED_INSIGHTS_API` /
 * `$PAGESPEED_API_KEY`, then `.env.local`, then `.env` — a bare `node scripts/...` run does
 * not load dotenv files itself, which is why the script reads them. If none is found, ASK
 * the developer to create one (the quota error prints the steps). It is a local dev
 * credential: it does not belong in Vercel/production env vars.
 *
 * Lab numbers here are Google's hardware, not yours — never compare them against local
 * Lighthouse numbers (see checklist X5).
 *
 * PRIVACY: this sends the URL to Google. Public pages only — never a tunnel, a preview
 * URL with a token in it, or anything unpublished.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join, resolve } from "node:path";

const argv = process.argv.slice(2);
const flag = (name, fallback = undefined) => {
  const hit = argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  return hit.includes("=") ? hit.slice(hit.indexOf("=") + 1) : true;
};

const OUT_DIR = resolve(String(flag("out", ".pagespeed")));
const TARGETS_FILE = resolve(String(flag("targets", "pagespeed-targets.json")));
const STRATEGY = String(flag("strategy", "mobile"));
const ORIGIN_ONLY = flag("origin-only", false) === true;
const JSON_ONLY = flag("json", false) === true;
const QUIET = flag("quiet", false) === true || JSON_ONLY;

/** Env var names that have been used for a PSI key, in precedence order. */
const KEY_VARS = ["PSI_API_KEY", "PAGE_SPEED_INSIGHTS_API", "PAGESPEED_API_KEY"];

/**
 * Resolve the PSI API key: `--key` → a known env var → a dotenv file.
 *
 * Reading `.env.local` matters because that's where the key usually already lives, and a
 * plain `node scripts/...` run does NOT load it (only the framework's own dev/build does).
 * Without this the script reports "quota exhausted" on a project that has a perfectly good
 * key sitting on disk — a confusing failure that looks like Google's fault.
 *
 * The key is a **secret**: it is never logged, never written to a report, and never included
 * in an error message. Only its source (which file or var) is ever named.
 */
function resolveApiKey() {
  const fromFlag = flag("key");
  if (typeof fromFlag === "string" && fromFlag) return { key: fromFlag, source: "--key" };

  for (const v of KEY_VARS) {
    if (process.env[v]) return { key: process.env[v], source: `$${v}` };
  }

  for (const file of [".env.local", ".env"]) {
    const path = resolve(file);
    if (!existsSync(path)) continue;
    let text;
    try { text = readFileSync(path, "utf8"); } catch { continue; }
    for (const v of KEY_VARS) {
      // KEY=value, tolerating `export `, quotes, and trailing comments/whitespace.
      const m = text.match(new RegExp(`^\\s*(?:export\\s+)?${v}\\s*=\\s*(.+)$`, "m"));
      if (!m) continue;
      const val = m[1].trim().replace(/\s+#.*$/, "").trim().replace(/^(['"])(.*)\1$/, "$2");
      if (val) return { key: val, source: `${file} (${v})` };
    }
  }
  return { key: undefined, source: null };
}

const { key: API_KEY, source: API_KEY_SOURCE } = resolveApiKey();

if (!["mobile", "desktop"].includes(STRATEGY)) die(`--strategy must be mobile|desktop (got "${STRATEGY}")`);

const log = (...a) => { if (!QUIET) console.log(...a); };
function die(msg) { console.error(`✗ ${msg}`); process.exit(1); }
const isUrl = (s) => { try { new URL(s); return true; } catch { return false; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── targets ──────────────────────────────────────────────────────────────────
function resolveTargets() {
  const single = flag("url");
  if (typeof single === "string") {
    // Reject a scheme-less or unparseable URL (`https://` with no host) here rather than
    // send it to PSI. The same check is in lh-run.mjs and console-check.mjs.
    if (!/^https?:\/\//i.test(single) || !isUrl(single)) {
      die(`--url must be an absolute http(s) URL (got "${single}")`);
    }
    // Slug and host-qualify, exactly as lh-run.mjs does. Unslugged, `--url=…/posts?page=2`
    // labels as `posts?page=2` and goes straight into a report filename; unqualified by host,
    // two deployments of the same path overwrite one report — and the two runners' ad-hoc
    // reports for the same page could not be joined, which is the contract stated below.
    return [{ url: single, label: adhocLabel(single), tier: "adhoc" }];
  }

  if (!existsSync(TARGETS_FILE)) {
    die(`no --url given and no targets file at ${TARGETS_FILE}. Pass --url=https://<domain>/`);
  }
  const cfg = JSON.parse(readFileSync(TARGETS_FILE, "utf8"));
  const origin = cfg.origins?.deployed;
  if (!origin) die(`"origins.deployed" is not set in ${TARGETS_FILE} — PSI needs a public URL.`);
  const base = origin.replace(/\/$/, "");

  if (ORIGIN_ONLY) return [{ url: base + "/", label: "origin", tier: "origin" }];

  const tiers = String(flag("tier", "tier1,tier2")).split(",").map((t) => t.trim()).filter(Boolean);

  // PSI cannot authenticate. Passing the auth tier here would ship internal URLs to Google
  // and score whatever the login redirect lands on.
  if (tiers.includes("auth")) {
    die(`the "auth" tier is local-only — PSI cannot authenticate, so it would send an internal\n` +
        `  URL to Google and score the login page. Measure authenticated pages with lh-run.mjs\n` +
        `  and a Playwright storageState instead.`);
  }

  const targets = [];
  for (const tier of tiers) {
    for (const entry of cfg[tier] ?? []) {
      const path = entry.path ?? entry;
      targets.push({ url: /^https?:\/\//.test(path) ? path : base + path, label: slug(entry.label ?? labelFromUrl(path)), tier });
    }
  }
  if (!targets.length) die(`no targets for tier(s) ${tiers.join(", ")} in ${TARGETS_FILE}`);
  return targets;
}

// Must match lh-run.mjs exactly — including the trailing-slash strip. Otherwise
// `/pricing/` labels as `pricing-` here and `pricing` there, and the two runners' reports
// for the same page can't be joined.
const labelFromUrl = (u) => {
  const path = u.replace(/^https?:\/\/[^/]+/, "").replace(/\/$/, "") || "/";
  return path === "/" ? "home" : path.replace(/^\//, "").replace(/\//g, "-");
};

const slug = (s) =>
  String(s).normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/^[-.]+|[-.]+$/g, "").slice(0, 80) || "unnamed";

const safeHost = (u) => { try { return new URL(u).host; } catch { return "unknown-host"; } };

/** Ad-hoc label for `--url`. Must match lh-run.mjs exactly, like everything else in this block.
 *
 *  Budget the 80-char cap so the HOST always survives. `slug(path + "-" + host)` truncates the
 *  joined string from the right, so any path over ~80 chars — an ordinary blog or docs URL —
 *  sliced the host straight back off, silently undoing the host-qualification it was added for
 *  (1.6.3) and letting two deployments of that page overwrite one report again. Truncating a
 *  derived value has to be budgeted at the point the parts are joined, not after. */
const adhocLabel = (u) => {
  const host = slug(safeHost(u)).slice(0, 40);
  const path = slug(labelFromUrl(u)).slice(0, Math.max(1, 80 - host.length - 1));
  return slug(`${path}-${host}`);
};


// ── PSI call ─────────────────────────────────────────────────────────────────
async function runPsi(url) {
  const qs = new URLSearchParams({ url, strategy: STRATEGY });
  for (const c of ["performance", "accessibility", "best-practices", "seo"]) qs.append("category", c);
  if (API_KEY) qs.set("key", API_KEY);

  // NOTE: this URL contains the API key. Never log `endpoint`, and never put it in an error
  // message — `die()` output ends up in terminals, CI logs, and pasted bug reports.
  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${qs}`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    let res;
    try {
      // A PSI analysis legitimately takes tens of seconds, so the bound is generous — but
      // unbounded means a stalled connection hangs the script with no output at all.
      res = await fetch(endpoint, { signal: AbortSignal.timeout(120_000) });
    } catch (err) {
      if (err?.name === "TimeoutError" && attempt < 3) {
        log(`  ⚠ PSI request timed out; retrying (attempt ${attempt}/3)`);
        continue;
      }
      die(`PSI request failed for ${url}: ${err?.message ?? err}`);
    }
    if (res.ok) return res.json();
    const body = await res.text().catch(() => "");

    // A *daily* quota is not worth retrying — and without a key you share one anonymous
    // pool with the whole internet, so this is the single most common PSI failure.
    // Match the daily limit's text only. `RESOURCE_EXHAUSTED` is the status of EVERY Google
    // quota 429, including the per-minute ones, and those should back off and retry below.
    if (res.status === 429 && /per day/i.test(body)) {
      die(`PSI daily quota exhausted${API_KEY ? "" : " for the shared anonymous pool"}.\n` +
          (API_KEY
            ? `  This key is over its daily limit — wait, or raise the quota in Google Cloud.`
            : `  Unkeyed requests share one global quota that is regularly exhausted — expect this\n` +
              `  to fail even on the first call of the day. A free API key is effectively a\n` +
              `  PREREQUISITE for field data, not an optimization.\n` +
              `\n  Ask the developer to set one up (2 minutes):\n` +
              `    1. https://console.cloud.google.com/apis/library/pagespeedonline.googleapis.com\n` +
              `       → Enable (any project; the free tier is 25k requests/day)\n` +
              `    2. APIs & Services → Credentials → Create credentials → API key\n` +
              `    3. Save it as PSI_API_KEY in .env.local (this script reads that file)\n` +
              `  Then re-run. Checked: --key, $${KEY_VARS.join(", $")}, .env.local, .env\n` +
              `  It is a LOCAL dev credential — it does not belong in Vercel/production env vars.`) +
          `\n  Meanwhile: local Lighthouse (lh-run.mjs) still works — you just have no FIELD data.`);
    }

    // Transient 429/5xx — back off and retry, honoring Retry-After when Google sends it
    // (guessing shorter than the server asked just burns another attempt).
    if ([429, 500, 502, 503].includes(res.status) && attempt < 3) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const wait = Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 60_000)
        : attempt * 8000;
      log(`  ⚠ PSI ${res.status}; retrying in ${wait / 1000}s (attempt ${attempt}/3)`);
      await sleep(wait);
      continue;
    }
    die(`PSI ${res.status} for ${url}\n${body.slice(0, 600)}`);
  }
}

const CWV_LABEL = { FAST: "good", AVERAGE: "needs improvement", SLOW: "poor" };

function fieldMetrics(experience) {
  if (!experience?.metrics) return null;
  const pick = (key, divisor = 1) => {
    const m = experience.metrics[key];
    if (!m) return null;
    return { p75: Number((m.percentile / divisor).toFixed(divisor === 1 ? 0 : 2)), verdict: CWV_LABEL[m.category] ?? m.category };
  };
  return {
    source: experience.overall_category ? CWV_LABEL[experience.overall_category] ?? experience.overall_category : null,
    lcp: pick("LARGEST_CONTENTFUL_PAINT_MS"),
    inp: pick("INTERACTION_TO_NEXT_PAINT"),
    cls: pick("CUMULATIVE_LAYOUT_SHIFT_SCORE", 100),
    fcp: pick("FIRST_CONTENTFUL_PAINT_MS"),
    ttfb: pick("EXPERIMENTAL_TIME_TO_FIRST_BYTE"),
  };
}

const FIELD_KEYS = ["lcp", "inp", "cls", "fcp", "ttfb"];

/**
 * Merge url-level and origin-level CrUX **per metric**, preferring url-level.
 *
 * CrUX qualifies each metric independently, so url-level data is routinely **partial**: a
 * page can have enough samples for FCP and none for LCP/INP/CLS. Treating "url-level exists"
 * as all-or-nothing reported `LCP -ms` while the origin had LCP/INP/CLS for all three — which
 * hid the single highest-authority signal this skill has (principle 3: field outranks lab)
 * behind a formatting choice, and made a passing site look unmeasured.
 *
 * Each metric therefore carries its own `scope`, because they are NOT interchangeable:
 * url-level describes this page, origin-level averages the whole site and can hide a slow
 * page behind fast ones. Report the scope next to the number, never silently.
 */
function mergeField(urlMetrics, originMetrics) {
  if (!urlMetrics && !originMetrics) return null;
  const out = {};
  for (const k of FIELD_KEYS) {
    const u = urlMetrics?.[k];
    const o = originMetrics?.[k];
    if (u) out[k] = { ...u, scope: "url" };
    else if (o) out[k] = { ...o, scope: "origin" };
    else out[k] = null;
  }
  return out;
}

function summarize(payload, target) {
  const lhr = payload.lighthouseResult ?? {};
  const urlLevelAvailable =
    Boolean(payload.loadingExperience?.metrics) && payload.loadingExperience.origin_fallback !== true;
  const score = (cat) => {
    const s = lhr.categories?.[cat]?.score;
    return s === null || s === undefined ? null : Math.round(s * 100);
  };
  const num = (id) => (lhr.audits?.[id]?.numericValue ?? null);
  const round = (v) => (v === null ? null : Math.round(v));

  // Same extraction as lh-run.mjs: PSI returns a Lighthouse 12 LHR, whose `*-insight`
  // audits carry table details and no `overallSavingsMs`. Filtering on
  // details.type === "opportunity" silently drops them.
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

  return {
    label: target.label,
    tier: target.tier,
    url: target.url,
    strategy: STRATEGY,
    source: "psi",
    fetchedAt: new Date().toISOString(),
    scores: {
      performance: score("performance"),
      accessibility: score("accessibility"),
      bestPractices: score("best-practices"),
      seo: score("seo"),
    },
    lab: {
      lcpMs: round(num("largest-contentful-paint")),
      fcpMs: round(num("first-contentful-paint")),
      cls: num("cumulative-layout-shift") === null ? null : Number(num("cumulative-layout-shift").toFixed(3)),
      tbtMs: round(num("total-blocking-time")),
      ttfbMs: round(num("server-response-time")),
    },
    // CrUX: real users. When a URL has too little traffic, PSI does NOT omit
    // `loadingExperience` — it fills it with ORIGIN data and sets `origin_fallback: true`.
    // Reading it as URL-level data would report per-page field numbers that don't exist.
    // (Comparing `loadingExperience.id` to the requested URL can't detect this either: PSI
    // canonicalizes redirects and trailing slashes, so it produces false negatives on
    // genuine URL-level data.)
    field: (() => {
      // With --origin-only the caller explicitly asked for site-wide data, so never read
      // `loadingExperience` (that's page-level CrUX for whatever URL PSI resolved) — take the
      // origin payload alone and report the scope honestly.
      if (ORIGIN_ONLY) {
        const origin = fieldMetrics(payload.originLoadingExperience);
        return {
          url: null, origin, merged: mergeField(null, origin),
          urlDataAvailable: false,
          cruxId: payload.originLoadingExperience?.id ?? null,
        };
      }
      const url = urlLevelAvailable ? fieldMetrics(payload.loadingExperience) : null;
      const origin = fieldMetrics(
        payload.originLoadingExperience ?? (urlLevelAvailable ? null : payload.loadingExperience));
      return {
        url,
        origin,
        // Per-metric merge — url-level CrUX is often partial, so this is what to report.
        merged: mergeField(url, origin),
        urlDataAvailable: urlLevelAvailable,
        cruxId: payload.loadingExperience?.id ?? payload.originLoadingExperience?.id ?? null,
      };
    })(),
    opportunities,
  };
}

// ── main ─────────────────────────────────────────────────────────────────────
const targets = resolveTargets();
mkdirSync(join(OUT_DIR, "reports"), { recursive: true });
const results = [];

// Name the SOURCE, never the key. Knowing which file/var was used is the difference between
// "my key is broken" and "the script never found my key".
if (API_KEY) log(`  api key: found via ${API_KEY_SOURCE}`);
else log(`  api key: none found (checked --key, $${KEY_VARS.join(", $")}, .env.local, .env)\n` +
         `           unkeyed requests share an anonymous daily quota and usually fail`);

for (const [i, target] of targets.entries()) {
  log(`\n▸ ${target.label} (${target.tier}) — PSI ${STRATEGY}\n  ${target.url}`);
  const payload = await runPsi(target.url);
  const s = summarize(payload, target);
  results.push(s);

  log(`  lab:   perf ${s.scores.performance} · a11y ${s.scores.accessibility} · bp ${s.scores.bestPractices} · seo ${s.scores.seo}`);
  const f = s.field.merged;
  if (f) {
    // Mark each metric's scope inline: `o` = origin-level (whole site), which can hide a slow
    // page behind fast ones. An unmarked metric is genuine URL-level data for this page.
    const fmt = (m, unit = "ms") =>
      m ? `${m.p75}${unit} (${m.verdict}${m.scope === "origin" ? ", origin" : ""})` : "no data";
    log(`  field: LCP ${fmt(f.lcp)} · INP ${fmt(f.inp)} · CLS ${fmt(f.cls, "")}`);
    // Compare like with like. An ORIGIN-level `cruxId` is just `https://host` with no path, so
    // testing it against the full target URL flagged a "redirect" on every single route that
    // had only origin-level data — which was every route. Compare full IDs only when the data
    // really is URL-level; otherwise compare origins.
    let cruxMismatch = false;
    if (s.field.cruxId) {
      try {
        cruxMismatch = s.field.urlDataAvailable
          ? s.field.cruxId.replace(/\/$/, "") !== target.url.replace(/\/$/, "")
          : new URL(s.field.cruxId).origin !== new URL(target.url).origin;
      } catch { cruxMismatch = false; }
    }
    if (cruxMismatch) {
      log(`         CrUX reports this as ${s.field.cruxId} — check for a redirect (www/apex) if that's unexpected`);
    }
    if (FIELD_KEYS.some((k) => f[k]?.scope === "origin")) {
      log(`         some metrics are ORIGIN-level (site-wide average), not this page`);
    }
  } else {
    log(`  field: no CrUX data at url OR origin level — too little traffic. Unmeasured, NOT a pass.`);
  }

  writeFileSync(join(OUT_DIR, "reports", `${s.label}-psi-${STRATEGY}.json`), JSON.stringify(s, null, 2));

  // Keep PSI's full Lighthouse report too, for the same reason lh-run.mjs does (checklist
  // X10): the summary says a category dropped, only `audits.<id>.details` says why. This
  // matters MORE here than locally — this is the deployed site, so it's the only place a
  // finding can be confirmed as real rather than a localhost artifact.
  // (`loadingExperience` is CrUX field data, kept alongside so the pair is self-contained.)
  if (payload.lighthouseResult) {
    writeFileSync(join(OUT_DIR, "reports", `${s.label}-psi-${STRATEGY}.lhr.json`),
      JSON.stringify({
        lighthouseResult: payload.lighthouseResult,
        loadingExperience: payload.loadingExperience,
        originLoadingExperience: payload.originLoadingExperience,
      }));
  }
  // `source` discriminates the two runners' rows — same ledger, different measurement
  // surfaces, never comparable to each other (checklist X5).
  appendFileSync(join(OUT_DIR, "history.jsonl"),
    JSON.stringify({ at: s.fetchedAt, source: "psi", ...s, opportunities: undefined }) + "\n");

  // Pace unkeyed requests; PSI rate-limits aggressively without an API key.
  if (!API_KEY && i < targets.length - 1) await sleep(3000);
}

if (JSON_ONLY) {
  console.log(JSON.stringify(results, null, 2));
} else {
  console.log(`\n${"Page".padEnd(22)}${"Perf".padEnd(7)}${"A11y".padEnd(7)}${"BP".padEnd(7)}${"SEO".padEnd(7)}${"fLCP".padEnd(10)}${"fINP".padEnd(10)}fCLS`);
  for (const r of results) {
    const f = r.field.merged ?? {};
    // `°` marks an origin-level (site-wide) value rather than data for this specific page.
    const cell = (m, unit) => (m ? `${m.p75}${unit}${m.scope === "origin" ? "°" : ""}` : "-");
    console.log(
      String(r.label).slice(0, 21).padEnd(22) +
      String(r.scores.performance ?? "-").padEnd(7) +
      String(r.scores.accessibility ?? "-").padEnd(7) +
      String(r.scores.bestPractices ?? "-").padEnd(7) +
      String(r.scores.seo ?? "-").padEnd(7) +
      cell(f.lcp, "ms").padEnd(10) +
      cell(f.inp, "ms").padEnd(10) +
      cell(f.cls, "")
    );
  }
  console.log(`\nf* = CrUX field p75 (real users) · ° = origin-level (site-wide), not this page.`);
  console.log(`Lab numbers are Google's hardware — don't compare them to local runs, and a single`);
  console.log(`PSI lab run is very noisy (measured: 84 then 44 on back-to-back runs of one URL).`);
}
