"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLanguage } from "@/components/language-provider";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * SurfacesLedger — the /audit "six surfaces" as a full-bleed big-type
 * numbered index, porting the /consulting PracticeLedger grammar (numbered
 * rows, scroll-active nearest-center pick, hover/keyboard-focus lock,
 * SSR-static default, interactive/static mode split). Replaces the
 * md:grid-cols-2 card-steel grid + DisplacementWipeReveal entrance; all six
 * EN+IT title/description pairs are carried over byte-identical — including
 * the sixth surface's "where AI is the wrong answer" close, which is the
 * page's honesty signature.
 *
 * DUPLICATION NOTE: the measurement / pick / quickTo machinery below is
 * intentionally duplicated from ../consulting/practice-ledger.tsx rather
 * than extracted into a shared hook — extraction is a later, dedicated
 * refactor iteration; a literal port keeps this diff reviewable. If you fix
 * a bug in one file, fix it in BOTH.
 *
 * MICRO-TAG (considered, skipped): the redesign brief allowed a per-row
 * right-aligned mono micro-tag naming what we read on that surface, IF
 * derivable from existing content. The retired cards carry only
 * {title, desc}; the only artifact list on the page ("repos, dashboards,
 * data warehouse, ticketing") is a page-level FAQ answer, and slicing it
 * per-surface would invent claims. Skipped rather than invented.
 *
 * MECHANICS / MODES / A11Y: identical binding contract to practice-ledger —
 * one non-pinning ScrollTrigger over the list ("top 70%" / "bottom 30%"),
 * collapsed-geometry center cache with open-row compensation, per-row
 * gsap.quickTo writers re-targeted only on pick change, hover/focusin lock
 * overriding the scroll pick, entrance batch matching Reveal's contract
 * (IO at -18% bottom rootMargin, 0.85s expo.out, once, RM-gated). SSR
 * default is "static": full open ledger for no-JS / crawlers / reduced
 * motion; same DOM in both modes (only tabIndex differs); descriptions are
 * height-clipped, never display:none, so screen readers always get the
 * full ledger. See practice-ledger.tsx for the long-form rationale.
 *
 * HIDDEN POSES ARE GSAP-ONLY (D-10, fixed in lockstep with practice-ledger):
 * no collapsed pose — side-tick scaleY, underline scaleX, description height —
 * may be baked into a className. Static mode never runs the interactive
 * effect, so a CSS `scale-y-0` / `scale-x-0` would leave the accents dead
 * forever on touch, no-JS and reduced-motion. Every resting pose is imposed by
 * the gsap.set() prime inside the interactive effect and released by its
 * clearProps teardown.
 */

type Surface = { num: string; title: string; desc: string };

function getSurfaces(isEn: boolean): Surface[] {
  return [
    {
      num: "01",
      title: isEn ? "Your systems & architecture" : "I vostri sistemi e l'architettura",
      desc: isEn
        ? "Cloud, services, data flows, infra. Where the bottlenecks, single points of failure, and undocumented complexity actually live."
        : "Cloud, servizi, flussi di dati, infrastruttura. Dove vivono davvero i colli di bottiglia, i single point of failure e la complessità non documentata.",
    },
    {
      num: "02",
      title: isEn ? "Your data & ML readiness" : "Dati e readiness ML",
      desc: isEn
        ? "What data you have, where it lives, how clean it is, and whether it's in a state where anything (AI included) can actually use it."
        : "Quali dati avete, dove risiedono, quanto sono puliti, e se sono in uno stato tale da poter essere usati (AI inclusa).",
    },
    {
      num: "03",
      title: isEn ? "Your workflows & manual work" : "Workflow e lavoro manuale",
      desc: isEn
        ? "What your people do every day. Where humans are doing repetitive, rule-bound work that should be automated, and where they shouldn't be."
        : "Cosa fanno le persone ogni giorno. Dove ci sono lavori ripetitivi e basati su regole che andrebbero automatizzati, e dove invece non andrebbero.",
    },
    {
      num: "04",
      title: isEn ? "Your tooling & vendor stack" : "Tooling e stack di fornitori",
      desc: isEn
        ? "What you're paying for, what's overlapping, what's underused, and what's blocking faster delivery."
        : "Per cosa state pagando, cosa si sovrappone, cosa è sottoutilizzato e cosa frena una delivery più veloce.",
    },
    {
      num: "05",
      title: isEn ? "Your team & delivery cadence" : "Team e cadenza di delivery",
      desc: isEn
        ? "How decisions get made, where work gets stuck, and what's slowing engineering velocity."
        : "Come vengono prese le decisioni, dove il lavoro si blocca e cosa rallenta la velocity dell'ingegneria.",
    },
    {
      num: "06",
      title: isEn ? "Where AI could power your product" : "Dove l'AI può alimentare il vostro prodotto",
      desc: isEn
        ? "Concrete, named opportunities, not generic 'AI could help here.' Which surface, which model, what changes. Plus the parts where AI is the wrong answer and you should ship a rebuild or an automation instead."
        : "Opportunità concrete e specifiche, non un generico 'l'AI potrebbe aiutare'. Quale superficie, quale modello, cosa cambia. E le parti in cui l'AI è la risposta sbagliata e vi conviene fare un rebuild o un'automazione.",
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

export function SurfacesLedger() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const surfaces = getSurfaces(isEn);

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
  // replay it (enteredRef). Replaces the card era's DisplacementWipeReveal.
  useEffect(() => {
    const list = listRef.current;
    if (!list || enteredRef.current) return;
    const rows = Array.from(list.querySelectorAll<HTMLElement>("[data-sl-row]"));
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
    const rowEls = Array.from(list.querySelectorAll<HTMLElement>("[data-sl-row]"));
    if (rowEls.length === 0) return;

    // ---- Build per-row writers. Prime the FULL pose of every quickTo
    // target once (repo convention: unrecorded transforms trip "not eligible
    // for reset" when a quickTo later touches them).
    const fx: RowFx[] = [];
    for (const el of rowEls) {
      const titleEl = el.querySelector<HTMLElement>("[data-sl-title]");
      const numEl = el.querySelector<HTMLElement>("[data-sl-num]");
      const tickEl = el.querySelector<HTMLElement>("[data-sl-tick]");
      const underEl = el.querySelector<HTMLElement>("[data-sl-under]");
      const wrapEl = el.querySelector<HTMLElement>("[data-sl-desc-wrap]");
      const innerEl = el.querySelector<HTMLElement>("[data-sl-desc-inner]");
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
      const row = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-sl-row]");
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
      {surfaces.map((s) => (
        <li
          key={s.num}
          data-sl-row
          tabIndex={detected && mode === "interactive" ? 0 : undefined}
          className="group relative rounded-sm py-[clamp(1.5rem,3vh,2.5rem)] outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--accent)/0.45)]"
        >
          {/* Head — mono number + huge display-serif title. Baseline-aligned
              so the small number sits on the big title's first baseline. */}
          <div className="grid grid-cols-[2.75rem_1fr] items-baseline gap-x-2 sm:grid-cols-[4.25rem_1fr]">
            <span
              data-sl-num
              className="relative pl-3 font-mono text-[11px] tracking-[0.22em] text-accent sm:pl-4 sm:text-xs"
            >
              {/* Side tick — sweeps in (scaleY) on the active row. The hidden
                  pose (scaleY 0) is imposed by GSAP in interactive mode only,
                  never in CSS: a baked `scale-y-0` would leave the tick dead
                  forever in static mode (touch / no-JS / reduced-motion),
                  where nothing ever scales it back up. */}
              <span
                data-sl-tick
                aria-hidden="true"
                className="absolute left-0 top-[0.05em] h-[1.15em] w-[2px] origin-top bg-accent"
              />
              {s.num}
            </span>
            <div className="min-w-0">
              <h3
                data-sl-title
                className="font-display text-[clamp(2.25rem,5vw,4.5rem)] leading-[1.05] tracking-[-0.025em] text-ink text-balance"
              >
                {s.title}
              </h3>
              {/* Underline — sweeps open (scaleX, origin left) on the active
                  row. Occupies constant space: zero layout shift on hover.
                  Same rule as the tick: the collapsed pose is GSAP-only, so
                  static mode paints the rule at full width. */}
              <span
                data-sl-under
                aria-hidden="true"
                className="mt-3 block h-px w-24 origin-left bg-accent/80 sm:w-32"
              />
            </div>
          </div>
          {/* Description — always in the DOM (screen readers read the full
              ledger); the wrapper is height-clipped by GSAP in interactive
              mode and fully open in static/no-JS/reduced-motion. */}
          <div className="grid grid-cols-[2.75rem_1fr] gap-x-2 sm:grid-cols-[4.25rem_1fr]">
            <span aria-hidden="true" />
            <div data-sl-desc-wrap className="overflow-hidden">
              <p
                data-sl-desc-inner
                className="max-w-2xl pb-1 pt-3 text-[15px] leading-[1.6] text-ink-mute sm:text-base"
              >
                {s.desc}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
