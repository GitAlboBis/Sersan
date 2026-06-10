/* Headless visual QA for bonifica step 1 (DoD screenshots).
 * Uses the npx-cached playwright (1.60) by absolute path — NOT a repo dependency. */
const { chromium } = require("C:/Users/alber/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright");
const path = require("path");
const fs = require("fs");

const BASE = "http://localhost:3000";
const OUT = path.join(__dirname, "qa");
fs.mkdirSync(OUT, { recursive: true });

const consoleLog = {};

async function newPage(ctx, label) {
  const page = await ctx.newPage();
  consoleLog[label] = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning")
      consoleLog[label].push(`[${m.type()}] ${m.text().slice(0, 300)}`);
  });
  page.on("pageerror", (e) => consoleLog[label].push(`[pageerror] ${String(e).slice(0, 300)}`));
  return page;
}

async function settle(page, ms = 2500) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(ms); // preloader / reveal / canvas warmup
}

// Scroll through the pinned spine until the proof chips are actually visible
// (opacity > 0.5 and inside viewport), screenshotting when found.
async function captureChips(page, file) {
  let found = false;
  for (let i = 0; i < 40; i++) {
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(350);
    found = await page.evaluate(() => {
      const els = [...document.querySelectorAll("li, p")].filter((e) =>
        /named engagements/i.test(e.textContent || "")
      );
      for (const el of els) {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        let op = 1, node = el;
        while (node && node !== document.body) {
          op *= parseFloat(getComputedStyle(node).opacity || "1");
          node = node.parentElement;
        }
        if (r.top > 0 && r.bottom < innerHeight && style.visibility !== "hidden" && op > 0.5)
          return true;
      }
      return false;
    });
    if (found) break;
  }
  await page.waitForTimeout(600); // let the stage settle
  await page.screenshot({ path: path.join(OUT, file) });
  return found;
}

(async () => {
  const browser = await chromium.launch();
  const results = {};

  // ---------- DESKTOP 1440x900 ----------
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  let page = await newPage(desktop, "home-desktop");
  await page.goto(BASE + "/", { waitUntil: "load" });
  await settle(page, 4000);
  await page.screenshot({ path: path.join(OUT, "home-hero-desktop.png") });
  results.chipsDesktop = await captureChips(page, "home-chips-desktop.png");
  await page.close();

  page = await newPage(desktop, "faq-desktop");
  await page.goto(BASE + "/faq", { waitUntil: "load" });
  await settle(page);
  // open the accordion item containing the corrected ISO copy, best effort
  try {
    const q = page.locator("button, [role=button]", { hasText: /security|data|gdpr|sicurezza|dati/i }).first();
    await q.click({ timeout: 3000 });
    await page.waitForTimeout(600);
  } catch {}
  await page.screenshot({ path: path.join(OUT, "faq-desktop.png"), fullPage: false });
  results.faqHasISO = await page.evaluate(() => /ISO 27001/.test(document.body.innerText));
  results.faqHasSOC2 = await page.evaluate(() => /SOC ?2/.test(document.body.innerText));
  await page.close();

  page = await newPage(desktop, "services-desktop");
  await page.goto(BASE + "/services/mlops", { waitUntil: "load" });
  await settle(page);
  await page.screenshot({ path: path.join(OUT, "services-mlops-desktop.png") });
  results.servicesCanvas = await page.evaluate(() => !!document.querySelector("canvas"));
  await page.close();

  page = await newPage(desktop, "slug-desktop");
  await page.goto(BASE + "/case-studies/spherenode", { waitUntil: "load" });
  await settle(page);
  await page.screenshot({ path: path.join(OUT, "case-study-slug-desktop.png") });
  results.slugCanvas = await page.evaluate(() => !!document.querySelector("canvas"));
  await page.close();
  await desktop.close();

  // ---------- MOBILE 390x844 ----------
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });

  page = await newPage(mobile, "home-mobile");
  await page.goto(BASE + "/", { waitUntil: "load" });
  await settle(page, 4000);
  await page.screenshot({ path: path.join(OUT, "home-hero-mobile.png") });
  // mobile fallback may not pin — scroll until chips visible
  results.chipsMobile = await captureChips(page, "home-chips-mobile.png");
  await page.close();

  page = await newPage(mobile, "faq-mobile");
  await page.goto(BASE + "/faq", { waitUntil: "load" });
  await settle(page);
  await page.screenshot({ path: path.join(OUT, "faq-mobile.png") });
  await page.close();

  page = await newPage(mobile, "services-mobile");
  await page.goto(BASE + "/services/mlops", { waitUntil: "load" });
  await settle(page);
  await page.screenshot({ path: path.join(OUT, "services-mlops-mobile.png") });
  await page.close();
  await mobile.close();

  await browser.close();

  results.console = consoleLog;
  fs.writeFileSync(path.join(OUT, "qa-results.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})();
