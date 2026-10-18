#!/usr/bin/env node
/**
 * Layout-shift probe: load a URL N times in a mobile-sized Chrome and record every
 * `layout-shift` entry (value, time, shifted nodes) plus FCP and LCP as the browser saw them.
 *
 * Read-only: anonymous page loads, no clicks, no input. Needs `@playwright/test` (or run it from
 * a folder whose `node_modules` has it); honors `CHROME_PATH`. Writes its JSON under
 * `.pagespeed/reports/` in the current directory.
 *
 *   node scripts/pagespeed/cls-probe.mjs [--runs=3] [--throttle] <url> [<url> ...]
 *
 * --throttle applies Lighthouse's mobile network shape through CDP (150 ms RTT, 1.6 Mbps
 * down, 750 Kbps up) so a streamed response actually arrives in pieces, as it does on a phone.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const die = (msg) => { console.error(`✗ ${msg}`); process.exit(1); };
const args = process.argv.slice(2);
const urls = args.filter((a) => /^https?:\/\//i.test(a));
// `https://` with no host passes the scheme test, then crashes `new URL()` when the report is
// named, after every measurement has run; parse each one first. lh-run.mjs does the same.
for (const u of urls) { try { new URL(u); } catch { die(`not a URL: "${u}"`); } }
const runsFlag = (args.find((a) => a.startsWith("--runs=")) ?? "--runs=3").split("=")[1];
const runs = Number(runsFlag);
// 0 or "abc" would write an empty report, and Infinity would never finish.
if (!Number.isInteger(runs) || runs < 1) die(`--runs must be a whole number of at least 1 (got "${runsFlag}")`);
const throttle = args.includes("--throttle");
// --no-mobile drops Playwright's mobile emulation (meta-viewport handling, touch). Chrome flags
// shifts within 500 ms of a viewport change as `hadRecentInput`, and the emulated mobile viewport
// can trip that at load; a plain 412px desktop-mode viewport cannot.
const mobile = !args.includes("--no-mobile");
if (!urls.length) { console.error("usage: cls-probe.mjs [--runs=N] [--throttle] <url> [...]"); process.exit(1); }

// CLS is the largest session window, not the sum of every shift: a window closes after a gap of
// more than 1 s or once it is 5 s long (web.dev/articles/cls). Lighthouse and the field report
// this value, so a sum overstates CLS whenever shifts come more than a second apart.
const largestWindow = (shifts) => {
  let best = 0, sum = 0, first = -Infinity, last = -Infinity;
  for (const s of [...shifts].sort((a, b) => a.t - b.t)) {
    if (s.t - last > 1000 || s.t - first > 5000) { sum = 0; first = s.t; }
    sum += s.value;
    last = s.t;
    best = Math.max(best, sum);
  }
  return best;
};

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
  for (let i = 1; i <= runs; i++) {
    const context = await browser.newContext(mobile
      ? { viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true }
      : { viewport: { width: 412, height: 823 } });
    const page = await context.newPage();
    if (throttle) {
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8,
      });
    }
    await page.addInitScript(() => {
      window.__shifts = [];
      window.__paints = {};
      const describe = (n) => {
        if (!n || n.nodeType !== 1) return String(n?.nodeName ?? "?");
        const cls = typeof n.className === "string" ? n.className.split(/\s+/).slice(0, 3).join(".") : "";
        return n.tagName.toLowerCase() + (n.id ? "#" + n.id : "") + (cls ? "." + cls : "");
      };
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          window.__shifts.push({
            value: e.value, t: Math.round(e.startTime), recentInput: e.hadRecentInput,
            sources: (e.sources || []).slice(0, 4).map((s) => ({
              node: describe(s.node),
              from: [Math.round(s.previousRect.y), Math.round(s.previousRect.height)],
              to: [Math.round(s.currentRect.y), Math.round(s.currentRect.height)],
            })),
          });
        }
      }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) if (e.name === "first-contentful-paint") window.__paints.fcp = Math.round(e.startTime);
      }).observe({ type: "paint", buffered: true });
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) window.__paints.lcp = Math.round(e.startTime);
      }).observe({ type: "largest-contentful-paint", buffered: true });
    });
    let status = null;
    try {
      const res = await page.goto(url, { waitUntil: "load", timeout: 60_000 });
      status = res?.status() ?? null;
      await page.waitForTimeout(4000);
    } catch (err) {
      status = `nav error: ${String(err?.message ?? err).slice(0, 120)}`;
    }
    const data = await page.evaluate(() => ({ shifts: window.__shifts, paints: window.__paints })).catch(() => ({ shifts: [], paints: {} }));
    const unflagged = data.shifts.filter((s) => !s.recentInput);
    const cls = largestWindow(unflagged);
    const clsAll = largestWindow(data.shifts);
    const shiftSum = unflagged.reduce((n, s) => n + s.value, 0);
    // The init script also runs in every child frame, so an embed records its own shifts there.
    // Field CLS can include shifts inside frames; they are listed per frame, unscaled, and left
    // out of `cls`. A frame that navigated or closed is skipped.
    const frames = [];
    for (const frame of page.frames()) {
      if (frame === page.mainFrame()) continue;
      const shifts = await frame.evaluate(() => window.__shifts ?? []).catch(() => null);
      if (shifts?.length) frames.push({ url: frame.url(), cls: Number(largestWindow(shifts.filter((s) => !s.recentInput)).toFixed(4)), shifts });
    }
    out.push({ url, run: i, throttle, mobile, status, cls: Number(cls.toFixed(4)), clsIncludingFlagged: Number(clsAll.toFixed(4)), shiftSum: Number(shiftSum.toFixed(4)), ...data, frames });
    console.log(`${url} run ${i}${throttle ? " (throttled)" : ""}: status ${status} · CLS ${cls.toFixed(3)} (largest window; incl. flagged ${clsAll.toFixed(3)}; all shifts summed ${shiftSum.toFixed(3)}) · FCP ${data.paints.fcp ?? "-"}ms · LCP ${data.paints.lcp ?? "-"}ms · ${data.shifts.length} shift(s)`);
    for (const s of data.shifts) {
      console.log(`    shift ${s.value.toFixed(3)} @${s.t}ms hadRecentInput=${s.recentInput}: ` + s.sources.map((x) => `${x.node} y ${x.from[0]}→${x.to[0]}`).join("; "));
    }
    for (const f of frames) {
      console.log(`    frame ${f.url.slice(0, 100)}: ${f.shifts.length} shift(s), largest window ${f.cls.toFixed(3)} inside the frame (not in CLS above)`);
    }
    await context.close();
  }
}

await browser.close();
const dir = resolve(".pagespeed/reports");
mkdirSync(dir, { recursive: true });
const host = new URL(urls[0]).host.replace(/[^\w.-]+/g, "-");
writeFileSync(join(dir, `cls-probe-${host}${throttle ? "-throttled" : ""}${mobile ? "" : "-nomobile"}.json`), JSON.stringify(out, null, 2));
