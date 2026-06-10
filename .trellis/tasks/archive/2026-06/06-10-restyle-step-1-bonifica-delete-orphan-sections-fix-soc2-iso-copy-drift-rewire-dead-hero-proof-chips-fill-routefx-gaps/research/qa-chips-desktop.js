/* Targeted desktop capture of the handover-stage proof chips. */
const { chromium } = require("C:/Users/alber/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright");
const path = require("path");

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  await page.goto("http://localhost:3000/", { waitUntil: "load" });
  // Wait for the preloader overlay to fully clear before driving scroll.
  // Anchor on the leaf element holding the label; treat display/visibility/opacity
  // anywhere up the chain as "cleared". Headless WebGL warmup can take a while.
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
    { timeout: 90000, polling: 500 }
  );
  await page.waitForTimeout(2500);

  const span = await page.evaluate(() => {
    const el = document.querySelector('[data-line-anchor="hero"]');
    const r = el.getBoundingClientRect();
    return { top: r.top + scrollY, height: r.height, doc: document.documentElement.scrollHeight };
  });
  console.log("hero anchor span:", JSON.stringify(span));

  // Headless quirk: the preloader sometimes lingers until a real user gesture.
  await page.mouse.click(720, 450);
  await page.waitForTimeout(1500);

  let best = null;
  for (const f of [0.80, 0.85, 0.88, 0.91, 0.94, 0.97, 0.995]) {
    const y = Math.round(span.top + span.height * f - 450);
    // Real wheel events (Lenis listens to wheel); step toward the target.
    let cur = await page.evaluate(() => scrollY);
    for (let guard = 0; guard < 60 && Math.abs(cur - y) > 120; guard++) {
      await page.mouse.wheel(0, Math.max(-1200, Math.min(1200, y - cur)));
      await page.waitForTimeout(180);
      cur = await page.evaluate(() => scrollY);
    }
    await page.waitForTimeout(1400); // let lenis/ScrollTrigger + stage fade settle
    const vis = await page.evaluate(() => {
      // Preloader still covering? Then visibility is 0 regardless of DOM state.
      const pre = [...document.querySelectorAll("*")].find(
        (e) => e.children.length === 0 && /INITIALISING SIGNAL/i.test(e.textContent || "")
      );
      if (pre) {
        let op = 1, n = pre, covered = true;
        while (n && n !== document.documentElement) {
          const cs = getComputedStyle(n);
          if (cs.display === "none" || cs.visibility === "hidden") { covered = false; break; }
          op *= parseFloat(cs.opacity || "1");
          n = n.parentElement;
        }
        if (covered && op > 0.05) return 0;
      }
      const els = [...document.querySelectorAll("li, p, div")].filter(
        (e) => /named engagements/i.test(e.textContent || "") && e.children.length < 8
      );
      let bestOp = 0;
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight || r.height === 0) continue;
        let op = 1, n = el;
        while (n && n !== document.body) {
          op *= parseFloat(getComputedStyle(n).opacity || "1");
          n = n.parentElement;
        }
        bestOp = Math.max(bestOp, op);
      }
      return bestOp;
    });
    console.log(`fraction ${f} → scrollY ${y} → chip opacity ${vis.toFixed(2)}`);
    if (vis > (best?.vis ?? 0)) {
      best = { f, vis };
      await page.screenshot({ path: path.join(__dirname, "qa", "home-chips-desktop.png") });
    }
    if (vis > 0.9) break;
  }
  console.log("best:", JSON.stringify(best), "pageerrors:", errors.length);
  await browser.close();
})();
