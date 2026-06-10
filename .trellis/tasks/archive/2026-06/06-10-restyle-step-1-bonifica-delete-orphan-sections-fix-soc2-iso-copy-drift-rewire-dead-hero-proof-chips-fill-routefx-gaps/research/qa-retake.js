/* Retake the shots that fired while the preloader was still settling. */
const { chromium } = require("C:/Users/alber/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright");
const path = require("path");

const OUT = path.join(__dirname, "qa");

async function preloaderGone(page) {
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
      { timeout: 30000, polling: 400 }
    );
    return true;
  } catch {
    return false;
  }
}

async function shoot(ctx, url, file, label) {
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000" + url, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  let ok = await preloaderGone(page);
  if (!ok) {
    // gesture nudge, then wait again
    await page.mouse.click(200, 400);
    await page.mouse.wheel(0, 200);
    await page.mouse.wheel(0, -200);
    ok = await preloaderGone(page);
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, file) });
  console.log(`${label}: preloader cleared=${ok}`);
  await page.close();
}

(async () => {
  const browser = await chromium.launch();
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await shoot(desktop, "/services/mlops", "services-mlops-desktop.png", "services-desktop");
  await shoot(desktop, "/case-studies/spherenode", "case-study-slug-desktop.png", "slug-desktop");
  await desktop.close();

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await shoot(mobile, "/", "home-hero-mobile.png", "home-mobile");
  await shoot(mobile, "/services/mlops", "services-mlops-mobile.png", "services-mobile");
  await mobile.close();
  await browser.close();
})();
