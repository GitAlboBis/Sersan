/* Visual QA for restyle step 2 (DoD): home order, rail scrub/hover, /consulting#faq, /trust. */
const { chromium } = require("C:/Users/alber/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright");
const path = require("path");
const fs = require("fs");

const BASE = "http://localhost:3000";
const OUT = path.join(__dirname, "qa2");
fs.mkdirSync(OUT, { recursive: true });
const results = { console: {} };

async function newPage(ctx, label) {
  const page = await ctx.newPage();
  results.console[label] = [];
  page.on("pageerror", (e) => results.console[label].push(`[pageerror] ${String(e).slice(0, 250)}`));
  page.on("console", (m) => {
    if (m.type() === "error") results.console[label].push(`[error] ${m.text().slice(0, 250)}`);
  });
  return page;
}

async function preloaderGone(page) {
  // Background-tab rAF throttling can hold the preloader: nudge with a real gesture first.
  await page.mouse.click(400, 300).catch(() => {});
  try {
    await page.waitForFunction(
      () => {
        const label = [...document.querySelectorAll("*")].find(
          (e) => e.children.length === 0 && /INITIALISING SIGNAL/i.test(e.textContent || "")
        );
        if (!label) return true;
        let op = 1, n = label;
        while (n && n !== document.documentElement) {
          const cs = getComputedStyle(n);
          if (cs.display === "none" || cs.visibility === "hidden") return true;
          op *= parseFloat(cs.opacity || "1");
          n = n.parentElement;
        }
        return op < 0.05;
      },
      { timeout: 45000, polling: 400 }
    );
    return true;
  } catch {
    return false;
  }
}

async function wheelTo(page, targetY, maxSteps = 120) {
  let cur = await page.evaluate(() => scrollY);
  for (let i = 0; i < maxSteps && Math.abs(cur - targetY) > 100; i++) {
    await page.mouse.wheel(0, Math.max(-1100, Math.min(1100, targetY - cur)));
    await page.waitForTimeout(140);
    cur = await page.evaluate(() => scrollY);
  }
  await page.waitForTimeout(1200);
  return cur;
}

(async () => {
  const browser = await chromium.launch();
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // ---- HOME: order + rail ----
  let page = await newPage(desktop, "home");
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(2000);
  results.preloaderHome = await preloaderGone(page);
  await page.waitForTimeout(1500);

  // section anchor map for the new order
  results.anchorOrder = await page.evaluate(() =>
    [...document.querySelectorAll("[data-line-anchor]")].map((e) => ({
      a: e.getAttribute("data-line-anchor"),
      top: Math.round(e.getBoundingClientRect().top + scrollY),
    }))
  );

  // credibility strip just after spine
  const cred = results.anchorOrder.find((x) => x.a === "credibility");
  await wheelTo(page, Math.max(0, cred.top - 250));
  await page.screenshot({ path: path.join(OUT, "home-credibility.png") });

  // rail mid-scrub: scroll to middle of the case-studies section
  const rail = await page.evaluate(() => {
    const el = document.querySelector('[data-line-anchor="case-studies"]');
    const r = el.getBoundingClientRect();
    return { top: r.top + scrollY, height: r.height };
  });
  results.railSectionHeight = Math.round(rail.height);
  await wheelTo(page, Math.round(rail.top + rail.height * 0.45));
  await page.screenshot({ path: path.join(OUT, "home-rail-midscrub.png") });
  results.railState = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("[data-rail-card]")];
    const vis = cards.filter((c) => {
      const r = c.getBoundingClientRect();
      return r.right > 0 && r.left < innerWidth;
    });
    return { totalCards: cards.length, visibleCards: vis.length };
  });

  // hover a visible card center → scan sweep
  const cardBox = await page.evaluate(() => {
    const c = [...document.querySelectorAll("[data-rail-card]")].find((c) => {
      const r = c.getBoundingClientRect();
      return r.left > 100 && r.right < innerWidth - 100;
    });
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (cardBox) {
    await page.mouse.move(cardBox.x, cardBox.y);
    await page.waitForTimeout(900); // hover lerp + sweep
    await page.screenshot({ path: path.join(OUT, "home-rail-hover.png") });
  }
  results.hoverShot = !!cardBox;

  // /start CTA count on rendered home
  results.startCtas = await page.evaluate(
    () => document.querySelectorAll('a[href="/start"]').length
  );
  await page.close();

  // ---- /consulting#faq ----
  page = await newPage(desktop, "consulting");
  await page.goto(BASE + "/consulting#faq", { waitUntil: "load" });
  await page.waitForTimeout(2500);
  await preloaderGone(page);
  await page.evaluate(() => document.getElementById("faq")?.scrollIntoView());
  await page.waitForTimeout(1500);
  // open first accordion item
  try {
    await page.locator("#faq button").first().click({ timeout: 3000 });
    await page.waitForTimeout(600);
  } catch {}
  await page.screenshot({ path: path.join(OUT, "consulting-faq.png") });
  results.consultingFaq = await page.evaluate(() => !!document.getElementById("faq"));
  await page.close();

  // ---- /faq redirect ----
  page = await newPage(desktop, "faq-redirect");
  const resp = await page.goto(BASE + "/faq", { waitUntil: "domcontentloaded" });
  results.faqFinalUrl = page.url();
  results.faqStatus = resp ? resp.status() : null;
  await page.close();

  // ---- /trust ----
  page = await newPage(desktop, "trust");
  await page.goto(BASE + "/trust", { waitUntil: "load" });
  await page.waitForTimeout(2500);
  await preloaderGone(page);
  results.trustFaq = await page.evaluate(() => /Frequently asked|domande frequenti/i.test(document.body.innerText));
  const trustY = await page.evaluate(() => {
    const els = [...document.querySelectorAll("h2, h3")].filter((e) =>
      /Frequently asked|domande/i.test(e.textContent || "")
    );
    return els.length ? els[0].getBoundingClientRect().top + scrollY - 200 : 2000;
  });
  await wheelTo(page, trustY);
  await page.screenshot({ path: path.join(OUT, "trust-faq.png") });
  await page.close();
  await desktop.close();

  // ---- MOBILE: native rail ----
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  page = await newPage(mobile, "home-mobile");
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(2500);
  await preloaderGone(page);
  const mRail = await page.evaluate(() => {
    const el = document.querySelector("#work") || document.querySelector('[data-line-anchor="case-studies"]');
    return el ? el.getBoundingClientRect().top + scrollY : 4000;
  });
  await page.evaluate((y) => window.scrollTo(0, y + 100), mRail);
  await page.waitForTimeout(1500);
  results.mobileNative = await page.evaluate(() => {
    const rails = [...document.querySelectorAll("div, ul")].filter(
      (e) => getComputedStyle(e).overflowX === "auto" && e.querySelector("[data-rail-card]")
    );
    return rails.length > 0;
  });
  await page.screenshot({ path: path.join(OUT, "home-rail-mobile.png") });
  await page.close();
  await mobile.close();
  await browser.close();

  fs.writeFileSync(path.join(OUT, "qa2-results.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})();
