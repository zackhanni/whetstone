#!/usr/bin/env node
/**
 * Capture Chrome DevTools "Issues" (the source of Lighthouse's `inspector-issues` audit)
 * with their full reason, which the Lighthouse report collapses to an issue type.
 *
 * Read-only: it loads each URL anonymously and listens. No clicks, no form input. Needs
 * `@playwright/test`; honors `CHROME_PATH`. Writes its JSON under `.pagespeed/reports/`.
 *
 *   node scripts/pagespeed/issues-capture.mjs <url> [<url> ...]
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const urls = process.argv.slice(2).filter((a) => /^https?:\/\//i.test(a));
if (!urls.length) { console.error("usage: issues-capture.mjs <url> [...]"); process.exit(1); }
// `https://` with no host passes the scheme test, then crashes `new URL()` when the report is
// named, after every capture has run; parse each one first. lh-run.mjs does the same.
for (const u of urls) {
  try { new URL(u); } catch { console.error(`✗ not a URL: "${u}"`); process.exit(1); }
}

// @playwright/test, playwright or playwright-core, whichever the project has; all three export
// the same `chromium`. playwright-core ships no browser of its own, so set CHROME_PATH with it.
async function loadChromium() {
  for (const pkg of ["@playwright/test", "playwright", "playwright-core"]) {
    try {
      const m = await import(pkg);
      if (m.chromium) return m.chromium;
    } catch { /* try the next one */ }
  }
  console.error("Playwright not found: add @playwright/test (or playwright-core with CHROME_PATH set).");
  process.exit(1);
}
const chromium = await loadChromium();
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const out = [];

for (const url of urls) {
  // Mobile-sized viewport so the same layout Lighthouse measured is the one inspected.
  const context = await browser.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const issues = [];
  cdp.on("Audits.issueAdded", (e) => issues.push(e.issue));
  await cdp.send("Audits.enable");

  const violations = [];
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) => {
      console.error("[CSPV] " + JSON.stringify({
        blockedURI: e.blockedURI, violatedDirective: e.violatedDirective, effectiveDirective: e.effectiveDirective,
        sourceFile: e.sourceFile, lineNumber: e.lineNumber, columnNumber: e.columnNumber, sample: e.sample, disposition: e.disposition,
      }));
    });
  });
  page.on("console", (m) => {
    const t = m.text();
    if (!t.startsWith("[CSPV] ")) return;
    // The page's own scripts can log the same prefix; a line that isn't our JSON is skipped,
    // because a throw here would end the whole capture.
    try { violations.push(JSON.parse(t.slice(7))); } catch {}
  });

  let status = null;
  try {
    const res = await page.goto(url, { waitUntil: "load", timeout: 45_000 });
    status = res?.status() ?? null;
    await page.waitForTimeout(6000);
  } catch (err) {
    status = `nav error: ${String(err?.message ?? err).slice(0, 160)}`;
  }
  out.push({ url, finalUrl: page.url(), status, issues, violations });
  console.log(`\n▸ ${url} → ${page.url()} (${status})`);
  console.log(`  issues: ${issues.length} · securitypolicyviolation events: ${violations.length}`);
  for (const i of issues) console.log("  issue:", i.code, JSON.stringify(i.details).slice(0, 700));
  for (const v of violations) console.log("  cspv:", JSON.stringify(v).slice(0, 500));
  await context.close();
}

await browser.close();
const dir = resolve(".pagespeed/reports");
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, `issues-${new URL(urls[0]).host.replace(/[^\w.-]+/g, "-")}.json`), JSON.stringify(out, null, 2));
