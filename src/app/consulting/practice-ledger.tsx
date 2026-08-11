"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLanguage } from "@/components/language-provider";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * PracticeLedger — the /consulting practice areas as a full-bleed big-type
 * numbered index ("less cards, more animation, big text"). Replaces the 4×2
 * icon-card grid; all eight EN+IT content strings are carried over verbatim,
 * only the icons and card chrome are retired. The five detail routes the
 * retired cards held (recovered from the pre-ledger consulting-client.tsx,
 * commit a2e2602^: architecture → /services/architecture, automation →
 * /services/automation, data platforms → /audit, ML & production AI →
 * /services/engineering, MLOps → /services/mlops) are restored as a small
 * mono "Explore →" <Link> INSIDE each expanded description — it rides the
 * height-clip reveal, so it appears only when the row is active, and is
 * always visible in static/SSR mode (descriptions open). The row itself
 * stays non-link — the CTA is the row's only interactive element. Keyboard:
 * the link is tabbable and lives inside [data-pl-row], so the existing
 * focusin lock opens the row the moment the link receives focus.
 *
 * MECHANICS (same binding contract as services-section's POV pan):
 *   - ONE ScrollTrigger over the row list, start "top 70%" / end "bottom 30%",
 *     invalidateOnRefresh + onRefreshInit: measure. NO pin, NO pin-spacer
 *     (the [data-line-anchor="practice"] wrapper must never be re-parented);
 *     the page keeps scrolling naturally.
 *   - onUpdate maps scroll → "which row center is nearest the viewport
 *     center" (analytic, from measure()-cached document-space centers — zero
 *     getBoundingClientRect in the update path). Centers are cached in
 *     COLLAPSED geometry; the pick compensates rows below the open row by the
 *     open description's height, so no re-measure is needed per activation.
 *   - Active-row visuals are per-row gsap.quickTo writers re-targeted ONLY
 *     when the pick changes (never React state, never per-frame writes):
 *     title opacity 0.55→1, number opacity 0.45→1, cyan side-tick scaleY and
 *     underline scaleX sweeps, description height 0→measured px (expo.out,
 *     0.5s — the --ease-entrance equivalent) with an opacity/y slide on the
 *     inner copy.
 *   - HOVER / KEYBOARD FOCUS lock: pointerenter or focusin on a row makes IT
 *     the active row (lockIdx overrides the scroll pick); pointerleave /
 *     focusout releases the lock and the same quickTo writers ease back to
 *     the scroll-picked row. Rows are non-link → no cursor-pointer. The hover
 *     treatment itself is paint-only (opacity/transform); the expansion grows
 *     downward under the cursor so the hovered row never slides out from
 *     under it.
 *
 * MODES (services-section's split): "interactive" (desktop, fine pointer, no
 * reduced-motion) vs "static" (≤768px, coarse pointer, prefers-reduced-motion).
 * SSR default is "static" — the full ledger (all descriptions open, numbers
 * accent, side ticks and underlines at full extent) is what no-JS, crawlers,
 * and reduced-motion get; the interactive effect collapses/dims on mount.
 * Same DOM in both modes (only tabIndex differs), so content is never hostage
 * to motion.
 *
 * HIDDEN POSES ARE GSAP-ONLY (the door-beats / rule-beats / engagement-acts
 * contract). No collapsed pose — scaleY on the side tick, scaleX on the
 * underline, height on the description wrapper — may be baked into a
 * className. Baking `scale-y-0` / `scale-x-0` into CSS is exactly the D-10
 * defect: static mode never runs the effect that would scale them back up, so
 * touch, no-JS and reduced-motion users got dead pixels forever. Every resting
 * pose is imposed by the gsap.set() prime inside the interactive effect and
 * released by its clearProps teardown.
 *
 * A11Y: ul/li list semantics; descriptions stay in the DOM at all times
 * (height-clipped, never display:none / aria-hidden) so screen readers read
 * the full ledger; rows are focusable in interactive mode so keyboard users
 * can expand each entry.
 */

type PracticeArea = { num: string; title: string; desc: string; href?: string };

// href = the buyer path each retired practice card carried (recovered
// verbatim from the pre-ledger consulting-client.tsx, a2e2602^). Only the
// historical five: data platforms deliberately routed to /audit (its data &
// ML readiness surface is the entry engagement; no dedicated detail page);
// FinTech engineering and Quantitative ML never had a target; Fractional
// CTO's "#engage" was an in-page anchor, not a route — all stay link-free.
function getAreas(isEn: boolean): PracticeArea[] {
  return [
    {
      num: "01",
      title: isEn ? "Enterprise architecture" : "Architettura enterprise",
      desc: isEn
        ? "We design the system before we ship it. Boundaries, data flow, failure modes, and the upgrade path."
        : "Progettiamo il sistema prima di metterlo in produzione. Confini, flussi dati, modalità di errore e percorso di upgrade.",
      href: "/services/architecture",
    },
    {
      num: "02",
      title: isEn ? "Workflow automation" : "Automazione dei workflow",
      desc: isEn
        ? "Repetitive, rule-bound work that humans shouldn't be doing. We map it, automate it, monitor it."
        : "Lavoro ripetitivo e basato su regole che non dovrebbero fare le persone. Lo mappiamo, lo automatizziamo, lo monitoriamo.",
      href: "/services/automation",
    },
    {
      num: "03",
      title: isEn ? "Data platforms" : "Piattaforme dati",
      desc: isEn
        ? "From ingest to warehouse to BI. Built to be queried, governed, and understood."
        : "Dall'ingest al warehouse alla BI. Costruite per essere interrogate, governate e comprese.",
      href: "/audit",
    },
    {
      num: "04",
      title: isEn ? "ML & production AI" : "ML e AI in produzione",
      desc: isEn
        ? "Models that get to production and stay there. Pre-training, fine-tuning, RAG, agentic systems."
        : "Modelli che arrivano in produzione e ci restano. Pre-training, fine-tuning, RAG, sistemi agentici.",
      href: "/services/engineering",
    },
    {
      num: "05",
      title: "MLOps",
      desc: isEn
        ? "The boring infrastructure that makes AI shippable: feature stores, registries, monitoring, rollbacks."
        : "L'infrastruttura noiosa che rende l'AI rilasciabile: feature store, registry, monitoring, rollback.",
      href: "/services/mlops",
    },
    {
      num: "06",
      title: isEn ? "FinTech engineering" : "Ingegneria FinTech",
      desc: isEn
        ? "Low-latency, regulated, real money. Eight years of senior delivery at JPM, Revolut, Brevan Howard."
        : "Bassa latenza, regolamentato, denaro reale. Otto anni di delivery senior in JPM, Revolut, Brevan Howard.",
    },
    {
      num: "07",
      title: isEn ? "Quantitative ML" : "ML quantitativo",
      desc: isEn
        ? "Forecasting, signal generation, risk. The mathematics behind the trading and treasury surfaces."
        : "Forecasting, generazione di segnali, gestione del rischio. La matematica dietro trading e tesoreria.",
    },
    {
      num: "08",
      title: "Fractional CTO",
      desc: isEn
        ? "We own the roadmap, architecture governance, hiring, and delivery rituals for 3–12 months."
        : "Ci prendiamo carico di roadmap, governance architetturale, hiring e riti di delivery per 3–12 mesi.",
    },
  ];
}

/* ------------------------------------------------------------------------ */
/* Motion constants (all writes go through quickTo re-targeting).            */
/* ------------------------------------------------------------------------ */

/** Resting title ink opacity (desktop interactive mode). */
const REST_TITLE = 0.55;
/** Resting mono-number accent opacity ("accent-dimmed"). */
const REST_NUM = 0.45;
/** Description expand/collapse — the signature beat. */
const EXPAND_DUR = 0.5;
const EXPAND_EASE = "expo.out"; // --ease-entrance equivalent

type QuickWriter = (value: number) => gsap.core.Tween;

type RowFx = {
  el: HTMLElement;
  titleEl: HTMLElement;
  numEl: HTMLElement;
  tickEl: HTMLElement;
  underEl: HTMLElement;
  wrapEl: HTMLElement;
  innerEl: HTMLElement;
  titleTo: QuickWriter;
  numTo: QuickWriter;
  tickTo: QuickWriter;
  underTo: QuickWriter;
  heightTo: QuickWriter;
  innerTo: QuickWriter;
  innerYTo: QuickWriter;
  /** Natural (open) description height in px — measured, never per-frame. */
  descH: number;
  /** Row center in document space, COLLAPSED geometry. */
  center: number;
  on: boolean;
};

export function PracticeLedger() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const areas = getAreas(isEn);

  // SSR default = "static": the full ledger (descriptions open, numbers
  // accent) is the no-JS / crawler / reduced-motion paint. Interactive mode
  // is opted into after viewport detection, then GSAP imposes the resting
  // collapsed state while the rows are still below the fold.
  const [mode, setMode] = useState<"static" | "interactive">("static");
  const [detected, setDetected] = useState(false);
  const listRef = useRef<HTMLUListElement | null>(null);
  const enteredRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mobile = window.matchMedia("(max-width: 768px)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMode(mobile || coarse || reduced ? "static" : "interactive");
    setDetected(true);
  }, []);

  // Entrance — the site's stagger (Reveal's exact contract: IO at -18%
  // bottom rootMargin, 0.85s expo.out rise, played once, RM-gated). A GSAP
  // batch instead of <Reveal> wrappers so the row elements stay flat for the
  // scrub effect's queries. Runs in both modes; language switches never
  // replay it (enteredRef).
  useEffect(() => {
    const list = listRef.current;
    if (!list || enteredRef.current) return;
    const rows = Array.from(list.querySelectorAll<HTMLElement>("[data-pl-row]"));
    if (rows.length === 0) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      enteredRef.current = true;
      return;
    }

    gsap.set(rows, { autoAlpha: 0, y: 24 });
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            enteredRef.current = true;
            gsap.to(rows, {
              autoAlpha: 1,
              y: 0,
              duration: 0.85,
              ease: "expo.out",
              stagger: 0.06,
            });
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "0px 0px -18% 0px", threshold: 0 },
    );
    io.observe(list);
    return () => io.disconnect();
  }, []);

  // Scroll-scrub active row — interactive mode only. isEn is a dep on
  // purpose (services-section convention): an EN↔IT toggle changes title and
  // description heights → cached centers/descH go stale; a full rebuild
  // re-measures (cheap, rare).
  useEffect(() => {
    if (!detected || mode !== "interactive") return;
    const list = listRef.current;
    if (!list) return;
    const rowEls = Array.from(list.querySelectorAll<HTMLElement>("[data-pl-row]"));
    if (rowEls.length === 0) return;

    // ---- Build per-row writers. Prime the FULL pose of every quickTo
    // target once (repo convention: unrecorded transforms trip "not eligible
    // for reset" when a quickTo later touches them).
    const fx: RowFx[] = [];
    for (const el of rowEls) {
      const titleEl = el.querySelector<HTMLElement>("[data-pl-title]");
      const numEl = el.querySelector<HTMLElement>("[data-pl-num]");
      const tickEl = el.querySelector<HTMLElement>("[data-pl-tick]");
      const underEl = el.querySelector<HTMLElement>("[data-pl-under]");
      const wrapEl = el.querySelector<HTMLElement>("[data-pl-desc-wrap]");
      const innerEl = el.querySelector<HTMLElement>("[data-pl-desc-inner]");
      if (!titleEl || !numEl || !tickEl || !underEl || !wrapEl || !innerEl) continue;

      gsap.set(titleEl, { opacity: REST_TITLE });
      gsap.set(numEl, { opacity: REST_NUM });
      gsap.set(tickEl, { scaleY: 0, transformOrigin: "50% 0%" });
      gsap.set(underEl, { scaleX: 0, transformOrigin: "0% 50%" });
      gsap.set(wrapEl, { height: 0 });
      gsap.set(innerEl, { opacity: 0, y: 10 });

      fx.push({
        el,
        titleEl,
        numEl,
        tickEl,
        underEl,
        wrapEl,
        innerEl,
        titleTo: gsap.quickTo(titleEl, "opacity", { duration: 0.45, ease: "expo.out" }),
        numTo: gsap.quickTo(numEl, "opacity", { duration: 0.4, ease: "power2.out" }),
        tickTo: gsap.quickTo(tickEl, "scaleY", { duration: 0.5, ease: "expo.out" }),
        underTo: gsap.quickTo(underEl, "scaleX", { duration: 0.6, ease: "expo.out" }),
        heightTo: gsap.quickTo(wrapEl, "height", { duration: EXPAND_DUR, ease: EXPAND_EASE }),
        innerTo: gsap.quickTo(innerEl, "opacity", { duration: 0.4, ease: "power2.out" }),
        innerYTo: gsap.quickTo(innerEl, "y", { duration: EXPAND_DUR, ease: EXPAND_EASE }),
        descH: 0,
        center: 0,
        on: false,
      });
    }
    if (fx.length === 0) return;

    // ---- Measurement (measure-time only — the update path reads caches).
    // Runs after the collapse prime above, so first-pass geometry is already
    // canonical. On later refreshes a row may be mid-open: subtract the
    // animated desc heights to recover collapsed-geometry centers.
    let vh = 0;
    const measure = () => {
      vh = window.innerHeight;
      let cum = 0; // open description height accumulated above the row
      for (const f of fx) {
        const openNow = f.wrapEl.offsetHeight; // current (animated) height
        f.descH = f.innerEl.offsetHeight; // natural height, padding included
        const top = f.el.getBoundingClientRect().top + window.scrollY - cum;
        const collapsedH = f.el.offsetHeight - openNow;
        f.center = top + collapsedH / 2;
        cum += openNow;
      }
    };
    measure();

    // ---- Active-row state machine. setActive re-targets writers ONLY for
    // rows whose on/off actually changed (max two per transition).
    let activeIdx: number | null = null;
    let scrollPick: number | null = null;
    let lockIdx: number | null = null; // hover / keyboard-focus override

    const setActive = (idx: number | null) => {
      if (idx === activeIdx) return;
      activeIdx = idx;
      for (let i = 0; i < fx.length; i++) {
        const f = fx[i];
        const on = i === idx;
        if (on === f.on) continue;
        f.on = on;
        f.titleTo(on ? 1 : REST_TITLE);
        f.numTo(on ? 1 : REST_NUM);
        f.tickTo(on ? 1 : 0);
        f.underTo(on ? 1 : 0);
        f.heightTo(on ? f.descH : 0);
        f.innerTo(on ? 1 : 0);
        f.innerYTo(on ? 0 : 10);
      }
    };

    // Nearest-row-to-viewport-center pick. Rows below the open row are
    // compensated by its full description height (the analytic stand-in for
    // the layout shift the expansion causes — no re-measure per activation).
    const pick = (scrollY: number): number => {
      const c = scrollY + vh / 2;
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < fx.length; i++) {
        const off =
          activeIdx !== null && i > activeIdx ? fx[activeIdx].descH : 0;
        const d = Math.abs(fx[i].center + off - c);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return best;
    };

    const st = ScrollTrigger.create({
      trigger: list,
      start: "top 70%",
      end: "bottom 30%",
      invalidateOnRefresh: true,
      onRefreshInit: measure,
      onRefresh: (self) => {
        if (self.isActive) {
          scrollPick = pick(self.scroll());
          if (lockIdx === null) setActive(scrollPick);
        }
      },
      onUpdate: (self) => {
        scrollPick = pick(self.scroll());
        if (lockIdx === null) setActive(scrollPick);
      },
      onToggle: (self) => {
        if (!self.isActive) {
          scrollPick = null;
          if (lockIdx === null) setActive(null); // all rows ease back to rest
        }
      },
    });
    // Init pose: covers a reload that restores a scroll position inside the
    // band — the picked row settles open via the same 0.5s writers (reads as
    // an intentional settle, not a jump).
    if (st.isActive) {
      scrollPick = pick(st.scroll());
      setActive(scrollPick);
    }

    // ---- Hover / keyboard-focus lock. While locked, the scroll pick keeps
    // updating in the background; release eases back to it.
    const lock = (i: number) => {
      lockIdx = i;
      setActive(i);
    };
    const release = () => {
      lockIdx = null;
      setActive(scrollPick);
    };
    const removers = fx.map((f, i) => {
      const onEnter = () => lock(i);
      f.el.addEventListener("pointerenter", onEnter);
      f.el.addEventListener("pointerleave", release);
      return () => {
        f.el.removeEventListener("pointerenter", onEnter);
        f.el.removeEventListener("pointerleave", release);
      };
    });
    const onFocusIn = (e: FocusEvent) => {
      const row = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-pl-row]");
      if (!row) return;
      const i = rowEls.indexOf(row);
      if (i >= 0) lock(i);
    };
    const onFocusOut = (e: FocusEvent) => {
      const next = e.relatedTarget as Node | null;
      if (next && list.contains(next)) return; // moving row→row: next focusin re-locks
      release();
    };
    list.addEventListener("focusin", onFocusIn);
    list.addEventListener("focusout", onFocusOut);

    // One-shot late refresh once webfonts land: Fraunces swap reflows the
    // big titles → descH and centers shift (the provider's root refresh runs
    // before fonts settle — same caveat as services-section).
    let fontsCancelled = false;
    document.fonts?.ready
      .then(() => {
        if (!fontsCancelled) ScrollTrigger.refresh();
      })
      .catch(() => {});

    return () => {
      fontsCancelled = true;
      removers.forEach((off) => off());
      list.removeEventListener("focusin", onFocusIn);
      list.removeEventListener("focusout", onFocusOut);
      st.kill();
      for (const f of fx) {
        gsap.killTweensOf([f.titleEl, f.numEl, f.tickEl, f.underEl, f.wrapEl, f.innerEl]);
        gsap.set(f.titleEl, { clearProps: "opacity" });
        gsap.set(f.numEl, { clearProps: "opacity" });
        gsap.set(f.tickEl, { clearProps: "transform" });
        gsap.set(f.underEl, { clearProps: "transform" });
        gsap.set(f.wrapEl, { clearProps: "height" });
        gsap.set(f.innerEl, { clearProps: "opacity,transform" });
      }
    };
  }, [detected, mode, isEn]);

  return (
    <ul ref={listRef} role="list" className="divide-y divide-rule/70">
      {areas.map((a) => (
        <li
          key={a.num}
          data-pl-row
          tabIndex={detected && mode === "interactive" ? 0 : undefined}
          className="group relative rounded-sm py-[clamp(1.5rem,3vh,2.5rem)] outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--accent)/0.45)]"
        >
          {/* Head — mono number + huge display-serif title. Baseline-aligned
              so the small number sits on the big title's first baseline. */}
          <div className="grid grid-cols-[2.75rem_1fr] items-baseline gap-x-2 sm:grid-cols-[4.25rem_1fr]">
            <span
              data-pl-num
              className="relative pl-3 font-mono text-[11px] tracking-[0.22em] text-accent sm:pl-4 sm:text-xs"
            >
              {/* Side tick — sweeps in (scaleY) on the active row. The hidden
                  pose (scaleY 0) is imposed by GSAP in interactive mode only,
                  never in CSS: a baked `scale-y-0` would leave the tick dead
                  forever in static mode (touch / no-JS / reduced-motion),
                  where nothing ever scales it back up. */}
              <span
                data-pl-tick
                aria-hidden="true"
                className="absolute left-0 top-[0.05em] h-[1.15em] w-[2px] origin-top bg-accent"
              />
              {a.num}
            </span>
            <div className="min-w-0">
              <h3
                data-pl-title
                className="font-display text-[clamp(2.25rem,5vw,4.5rem)] leading-[1.05] tracking-[-0.025em] text-ink text-balance"
              >
                {a.title}
              </h3>
              {/* Underline — sweeps open (scaleX, origin left) on the active
                  row. Occupies constant space: zero layout shift on hover.
                  Same rule as the tick: the collapsed pose is GSAP-only, so
                  static mode paints the rule at full width. */}
              <span
                data-pl-under
                aria-hidden="true"
                className="mt-3 block h-px w-24 origin-left bg-accent/80 sm:w-32"
              />
            </div>
          </div>
          {/* Description — always in the DOM (screen readers read the full
              ledger); the wrapper is height-clipped by GSAP in interactive
              mode and fully open in static/no-JS/reduced-motion. The inner
              block (measured for descH, slid as one) holds the copy plus,
              on the historical five, the "Explore →" buyer-path CTA — being
              inside the clip, the link only surfaces when the row is open. */}
          <div className="grid grid-cols-[2.75rem_1fr] gap-x-2 sm:grid-cols-[4.25rem_1fr]">
            <span aria-hidden="true" />
            <div data-pl-desc-wrap className="overflow-hidden">
              <div data-pl-desc-inner className="max-w-2xl pb-1 pt-3">
                <p className="text-[15px] leading-[1.6] text-ink-mute sm:text-base">
                  {a.desc}
                </p>
                {a.href ? (
                  <Link
                    href={a.href}
                    aria-label={
                      isEn ? `Explore ${a.title}` : `Approfondisci ${a.title}`
                    }
                    className="group/explore relative mt-3 inline-flex items-center gap-1.5 rounded-sm font-mono text-[11px] uppercase tracking-[0.18em] text-ink-mute outline-none transition-colors duration-200 hover:text-accent focus-visible:text-accent focus-visible:ring-1 focus-visible:ring-[hsl(var(--accent)/0.45)]"
                  >
                    {isEn ? "Explore" : "Approfondisci"}
                    <span
                      aria-hidden="true"
                      className="transition-transform duration-200 group-hover/explore:translate-x-0.5 group-focus-visible/explore:translate-x-0.5"
                    >
                      →
                    </span>
                    {/* Underline sweep — the ledger's own scaleX grammar. */}
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-accent/80 transition-transform duration-300 ease-out group-hover/explore:scale-x-100 group-focus-visible/explore:scale-x-100"
                    />
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
