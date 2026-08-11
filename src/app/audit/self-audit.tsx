"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { QUESTIONS, TOTAL_QUESTIONS, matchFindings } from "@/data/audit-questions";

/**
 * SelfAudit — the 60-second self-audit as /audit's participation beat,
 * mounted between the six-surfaces ledger (the thesis) and the deliverable
 * section (which then pays it off: "that was 60 seconds — here's what the
 * real report contains"). The engine is src/data/audit-questions.ts, used
 * as-is: QUESTIONS renders the flow, matchFindings() does the scoring —
 * nothing about the data module is reimplemented or altered here. All
 * question prompts, answer labels, finding names/descriptions and effort
 * strings come from the data module verbatim (EN+IT per entry); this file
 * adds only UI microcopy (eyebrow, start/back/reset labels, result heading,
 * closing bridge) — no claims invented.
 *
 * STATES — intro → quiz (one question at a time) → result:
 *   - intro: eyebrow + one display-serif line + a mono "Start →". This is
 *     the SSR paint (phase state initialises to "intro"), so no-JS and
 *     crawlers get a complete, honest static beat, never a broken quiz.
 *   - quiz: the prompt set large in the display serif (subordinate to the
 *     page H1's clamp), answers as full-width hairline rows (mono index +
 *     label, hover/focus brighten, cyan side tick marks a previously chosen
 *     answer on back-nav). A thin progress hairline under the eyebrow
 *     scales by question index; mono "← Back" walks backward (to intro
 *     from Q1). Selecting advances.
 *   - result: matchFindings(answers) top-3 as mini-beats (mono number +
 *     finding title + line + effort tag, staggered in), a closing line
 *     bridging to the page's existing #book-call CTA (a link — no new
 *     form), and a mono "Run again" reset. The engine can return fewer
 *     than 3 findings (e.g. mature answers raise no triggers), so the
 *     heading adapts by count and an empty state exists — same honesty
 *     contract as the page FAQ's "what if you find nothing?".
 *
 * MOTION — state-first, enhancement-after (the SSR-static philosophy
 * applied to transitions). Start/select/back/reset commit the React swap
 * SYNCHRONOUSLY in the click handler: the new step's content is in the
 * DOM, visible by default, before any animation is even considered. The
 * layout effect then plays ONE enter beat (~0.35s expo.out, the
 * --ease-entrance twin): content rises y·±14 with a fade while the stage's
 * height tweens old→new px and clears back to auto — no jump between
 * differently-sized steps; result findings cascade 0.09s apart. Back
 * inverts the slide direction.
 *
 * INTERRUPT-SAFETY (learned in live QA: an earlier exit→swap→enter chain
 * was severed by real-world input interleaving — click + Lenis scroll +
 * snap settle in the same window — leaving an empty stage and a wedged
 * busy flag, because ONE tween onComplete owned both the state swap and
 * the busy release). The rebuilt flow is invariant to who interrupts:
 *   - the swap is never hostage to a tween callback (it happens first);
 *   - from-poses exist only inside fromTo tweens — impose+drive is one
 *     atomic GSAP object, so a "pose set, timeline never ran" split state
 *     cannot exist;
 *   - the input cooldown is a CLOCK comparison (expires by time, nothing
 *     to clear) — it debounces double-clicks and can never wedge shut;
 *   - every beat pre-clears residue (height/overflow/opacity/transform)
 *     left by any interrupted predecessor before measuring;
 *   - a setTimeout watchdog restores the resting visible pose one beat
 *     after the timeline should have finished, whatever killed or starved
 *     it (idempotent after a clean finish);
 *   - hidden tab and prefers-reduced-motion (checked LIVE) get instant
 *     swaps with no poses at all.
 *
 * STATE — plain React state (this is DOM UI, not the WebGL island):
 *   phase / qIndex / answers(qid→choiceId). Language toggle mid-quiz:
 *   state holds only ids, text derives from the bilingual data at render,
 *   so an EN↔IT switch swaps copy in place and every selection persists.
 *   Ephemeral by design — no localStorage, no network.
 *
 * A11Y — answers/start/back/reset are real <button>s (Enter/Space native,
 * focus-visible rings per the family); on advance, focus moves to the new
 * question's first answer (result → the heading, tabIndex −1),
 * synchronously in the layout effect (no rAF to be starved) and with
 * preventScroll; the beat animates OPACITY, never visibility, so the
 * target is always focusable and SR-readable mid-beat; the stage is
 * aria-live="polite" so SRs announce each step; the previously chosen
 * answer carries aria-current on back-nav; the progress counter has an
 * sr-only "Question N of 5" twin.
 *
 * TAP TARGETS (D-14) — this beat is the one on the site that gives touch the
 * full desktop choreography, and its four mono controls used to be the
 * densest sub-44px cluster on it: bare type with no padding at all, so
 * "Start →" (the entry point to the entire quiz) measured ~18px tall.
 * Every one of them now carries HIT_PAD = `py-3.5` (0.875rem), and nothing
 * else changed — not the type scale, not the copy, not the horizontal
 * extent (the labels are all wider than 44px on their own, and zero side
 * padding keeps the `w-full` underline sweeps exactly as long as their
 * text). Resulting boxes at the 16px root floor: 12px controls 46px tall,
 * 11px controls 44.5px.
 *
 * The padding is then given straight back to the layout, so ≥1440px is
 * visually unchanged:
 *   - flex children ("← Back", "Book a scoping call", "Run again") pair it
 *     with `-my-3.5`; margins count toward a flex item's outer cross size,
 *     so each line keeps its old height and `items-baseline` still aligns
 *     "← Back" to the NN / NN counter beside it;
 *   - "Start →" is a block-flow child, so it repays the space through its
 *     top margin instead: `mt-8` → `mt-[1.125rem]`, and 1.125 + 0.875 = 2rem.
 * Underline sweeps move from `-bottom-0.5` to `bottom-3` for the same
 * reason — 0.875rem − 0.75rem = the original 0.125rem gap under the text.
 * All of it is rem-based, so it tracks the fluid root instead of fighting it.
 */

type Phase = "intro" | "quiz" | "result";

/** The site's entrance curve (--ease-entrance), per family constants. */
const EASE_ENTRANCE = "expo.out";
/** Enter beat length — the task's ~0.35s step. */
const ENTER_DUR = 0.35;
/**
 * Input cooldown between beats. A plain timestamp comparison — it expires
 * by the clock, so unlike a flag cleared in a tween callback it can NEVER
 * wedge shut. Long enough that a double-click can't answer two questions
 * with one gesture, short enough to never read as swallowed input.
 */
const COOLDOWN_MS = 250;

function prefersReduced(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** SSR-safe layout effect (client components still render on the server). */
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

type PendingBeat = {
  /** Stage height at swap time (old content), px. −1 = stage ref missing. */
  fromH: number;
  /** +1 forward, −1 back — flips the slide direction. */
  dir: 1 | -1;
};

export function SelfAudit({ isEn }: { isEn: boolean }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  /** Height-animated wrapper (aria-live region). */
  const stageRef = useRef<HTMLDivElement | null>(null);
  /** Slid/faded content inside the stage. */
  const innerRef = useRef<HTMLDivElement | null>(null);
  /** Set by transition(), consumed by the enter layout-effect. */
  const pendingRef = useRef<PendingBeat | null>(null);
  /** Clock-based input cooldown — see COOLDOWN_MS. */
  const cooldownUntilRef = useRef(0);
  /** Live enter timeline — killed if the user outruns it. */
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  /** The enter beat's finally-guard timer (setTimeout id, 0 = none). */
  const watchdogRef = useRef(0);

  /**
   * One step. STATE FIRST: the React swap happens synchronously in the
   * click handler and can never be lost to an interrupted tween — the new
   * step's content exists, visible by default, before any animation is
   * considered. A user scroll, snap settle, tab switch or second click
   * during the beat therefore cannot cancel the swap; at worst it degrades
   * the enhancement, which the layout effect's guards then self-heal.
   */
  const transition = (dir: 1 | -1, apply: () => void) => {
    const now = Date.now();
    if (now < cooldownUntilRef.current) return;
    cooldownUntilRef.current = now + COOLDOWN_MS;
    const stage = stageRef.current;
    // Old-content height, captured before the swap (a stranded mid-beat
    // fixed height is a fine from-value; the effect re-measures the target
    // on clean auto layout).
    pendingRef.current = { fromH: stage ? stage.offsetHeight : -1, dir };
    apply();
  };

  // Enter beat — runs pre-paint right after a transition()'s state swap
  // (pendingRef gates it, so mounts and language toggles never animate or
  // steal focus). The new content is ALREADY committed and visible by
  // default; everything below is enhancement, and every guard is either
  // idempotent or expires by the clock, so no interleaving (scroll, snap
  // settle, second click, tab switch) can leave the stage empty or hold a
  // fixed height.
  useIsoLayoutEffect(() => {
    const p = pendingRef.current;
    if (!p) return;
    pendingRef.current = null;
    const stage = stageRef.current;
    const inner = innerRef.current;
    if (!stage || !inner) return;

    // Pre-flight: neutralise residue from any previous (possibly
    // interrupted) beat so the new content's natural layout is the
    // baseline. Under reduced motion / hidden tab this IS the whole
    // "animation": an instant, clean swap.
    if (watchdogRef.current) {
      window.clearTimeout(watchdogRef.current);
      watchdogRef.current = 0;
    }
    tlRef.current?.kill();
    tlRef.current = null;
    gsap.killTweensOf([stage, inner]);
    gsap.set(stage, { clearProps: "height,overflow" });
    gsap.set(inner, { clearProps: "opacity,transform,visibility" });

    const animate =
      p.fromH >= 0 &&
      !prefersReduced() &&
      document.visibilityState === "visible";

    if (animate) {
      const toH = stage.offsetHeight;
      const cascade = Array.from(
        inner.querySelectorAll<HTMLElement>("[data-sa-finding]"),
      );
      // fromTo everywhere: the hidden from-pose exists only as part of the
      // tween that undoes it (imposed and driven by one atomic GSAP
      // object) — a "pose set, timeline never ran" split state cannot
      // exist. Opacity, NOT autoAlpha: visibility:hidden would make the
      // content unfocusable mid-beat (the focus() below would silently
      // fail) and is one more way to strand invisible content.
      const tl = gsap.timeline({ defaults: { ease: EASE_ENTRANCE } });
      if (Math.abs(toH - p.fromH) > 1) {
        tl.fromTo(
          stage,
          { height: p.fromH, overflow: "hidden" },
          { height: toH, duration: ENTER_DUR },
          0,
        );
      }
      tl.fromTo(
        inner,
        { opacity: 0, y: p.dir * 14 },
        { opacity: 1, y: 0, duration: ENTER_DUR },
        0.03,
      );
      if (cascade.length > 0) {
        tl.fromTo(
          cascade,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.45, stagger: 0.09 },
          0.12,
        );
      }
      tl.set(stage, { clearProps: "height,overflow" });
      tl.set([inner, ...cascade], { clearProps: "opacity,transform" });
      tlRef.current = tl;

      // FINALLY-guard: whatever kills or starves the timeline, the resting
      // visible pose is restored one beat after it should have finished.
      // Idempotent after a clean finish (re-clearing cleared props is a
      // no-op), and GSAP itself fast-forwards a starved timeline on tab
      // return — this is the belt to that braces.
      const targets = [stage, inner, ...cascade];
      watchdogRef.current = window.setTimeout(
        () => {
          watchdogRef.current = 0;
          tlRef.current?.kill();
          tlRef.current = null;
          gsap.killTweensOf(targets);
          gsap.set(stage, { clearProps: "height,overflow" });
          gsap.set([inner, ...cascade], { clearProps: "opacity,transform" });
        },
        (tl.duration() + 0.2) * 1000,
      );
    }

    // Focus follows the flow: new question's first answer, the result
    // heading, or Start when backing out to the intro. Synchronous — no
    // rAF to be starved — and the target is always focusable (the beat
    // never touches visibility). preventScroll: Lenis owns the scroll; a
    // later snap settle centring the section is its normal behaviour and
    // independent of the already-committed swap.
    const selector =
      phase === "quiz"
        ? "[data-sa-answer]"
        : phase === "result"
          ? "[data-sa-result-heading]"
          : "[data-sa-start]";
    inner.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
  }, [phase, qIndex]);

  // Unmount hygiene.
  useEffect(() => {
    return () => {
      if (watchdogRef.current) window.clearTimeout(watchdogRef.current);
      tlRef.current?.kill();
      const stage = stageRef.current;
      const inner = innerRef.current;
      if (stage && inner) gsap.killTweensOf([stage, inner]);
    };
  }, []);

  const start = () => transition(1, () => setPhase("quiz"));

  const select = (qid: string, choiceId: string) => {
    const last = qIndex + 1 >= TOTAL_QUESTIONS;
    transition(1, () => {
      setAnswers((a) => ({ ...a, [qid]: choiceId }));
      if (last) setPhase("result");
      else setQIndex((i) => i + 1);
    });
  };

  const back = () => {
    const toIntro = qIndex === 0;
    transition(-1, () => {
      if (toIntro) setPhase("intro");
      else setQIndex((i) => i - 1);
    });
  };

  const reset = () =>
    transition(1, () => {
      setAnswers({});
      setQIndex(0);
      setPhase("quiz");
    });

  // Progress hairline: scaleX by question index (answered count); full on
  // the result.
  const progress =
    phase === "intro" ? 0 : phase === "result" ? 1 : qIndex / TOTAL_QUESTIONS;

  const q = QUESTIONS[qIndex];
  const findings = phase === "result" ? matchFindings(answers) : [];

  const resultHeading =
    findings.length >= 3
      ? isEn
        ? "Your top 3 signals."
        : "I vostri 3 segnali principali."
      : findings.length === 2
        ? isEn
          ? "Your top signals."
          : "I vostri segnali principali."
        : isEn
          ? "Your top signal."
          : "Il vostro segnale principale.";

  return (
    // Width/centering is owned by the audit-client mount (Reveal wrapper,
    // max-w-3xl mx-auto — the FAQ's exact mount pattern).
    <div>
      {/* Eyebrow + progress hairline (the quiz's only persistent chrome). */}
      <div className="mb-10">
        <p className="eyebrow inline-flex items-center gap-2">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: "hsl(var(--accent))" }}
            aria-hidden="true"
          />
          {isEn ? "60-second self-audit" : "Self-audit di 60 secondi"}
        </p>
        <div className="relative mt-4 h-px bg-rule/70" aria-hidden="true">
          <span
            className="absolute inset-0 origin-left bg-accent transition-transform duration-500 ease-[var(--ease-entrance)] motion-reduce:transition-none"
            style={{ transform: `scaleX(${progress})` }}
          />
        </div>
      </div>

      {/* Stage — height-animated between steps; polite live region so SRs
          announce each new question / the result. */}
      <div ref={stageRef} aria-live="polite">
        <div ref={innerRef}>
          {phase === "intro" && (
            <div>
              <h3 className="font-display text-[clamp(1.75rem,3.2vw,2.75rem)] leading-[1.15] tracking-[-0.02em] text-ink text-balance pb-1">
                {isEn ? (
                  <>
                    Five questions.{" "}
                    <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                      A first read
                    </span>{" "}
                    on where your AI stands.
                  </>
                ) : (
                  <>
                    Cinque domande.{" "}
                    <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                      Una prima lettura
                    </span>{" "}
                    di dove sta la vostra AI.
                  </>
                )}
              </h3>
              {/* Entry point to the whole quiz — HIT_PAD'd to a real target
                  (see the docblock's TAP TARGETS note). `mt-8` becomes
                  `mt-[1.125rem]` because 1.125rem + HIT_PAD(0.875rem) === 2rem:
                  the label lands on exactly the same baseline it always did,
                  the box around it is just 28px taller. */}
              <button
                type="button"
                data-sa-start
                onClick={start}
                className="group/start relative mt-[1.125rem] inline-flex items-center gap-1.5 rounded-sm py-3.5 font-mono text-[12px] uppercase tracking-[0.18em] text-accent outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--accent)/0.45)]"
              >
                {isEn ? "Start" : "Inizia"}
                <span
                  aria-hidden="true"
                  className="transition-transform duration-200 group-hover/start:translate-x-0.5 group-focus-visible/start:translate-x-0.5 motion-reduce:transition-none"
                >
                  →
                </span>
                {/* Underline sweep — the ledger's scaleX grammar. Offset from
                    the padded box, not the border edge: HIT_PAD(0.875rem) −
                    bottom-3(0.75rem) = 0.125rem, i.e. the original
                    `-bottom-0.5`, so the rule still sits 2px under the text. */}
                <span
                  aria-hidden="true"
                  className="absolute bottom-3 left-0 h-px w-full origin-left scale-x-0 bg-accent/80 transition-transform duration-300 ease-out group-hover/start:scale-x-100 group-focus-visible/start:scale-x-100 motion-reduce:transition-none"
                />
              </button>
            </div>
          )}

          {phase === "quiz" && q && (
            <div>
              <div className="flex items-baseline justify-between gap-4">
                {/* HIT_PAD + the matching negative margin: the padding builds
                    the 44px target, `-my-3.5` hands the space straight back to
                    the flex line so the row keeps its exact height and the
                    label keeps its exact baseline against the NN / NN counter
                    (margins are part of a flex item's outer size, and the
                    baseline offset is margin-top + padding-top + ascent =
                    ascent, unchanged). */}
                <button
                  type="button"
                  onClick={back}
                  className="-my-3.5 rounded-sm py-3.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-mute outline-none transition-colors duration-200 hover:text-ink focus-visible:text-ink focus-visible:ring-1 focus-visible:ring-[hsl(var(--accent)/0.45)] motion-reduce:transition-none"
                >
                  {isEn ? "← Back" : "← Indietro"}
                </button>
                <p className="font-mono text-[11px] tracking-[0.22em] text-ink-mute">
                  <span aria-hidden="true">
                    {String(qIndex + 1).padStart(2, "0")} /{" "}
                    {String(TOTAL_QUESTIONS).padStart(2, "0")}
                  </span>
                  <span className="sr-only">
                    {isEn
                      ? `Question ${qIndex + 1} of ${TOTAL_QUESTIONS}`
                      : `Domanda ${qIndex + 1} di ${TOTAL_QUESTIONS}`}
                  </span>
                </p>
              </div>

              <h3
                id="sa-question"
                className="mt-6 font-display text-[clamp(1.75rem,3.2vw,2.75rem)] leading-[1.15] tracking-[-0.02em] text-ink text-balance pb-1"
              >
                {isEn ? q.promptEn : q.promptIt}
              </h3>

              <div
                role="group"
                aria-labelledby="sa-question"
                className="mt-8 border-y border-rule/70 divide-y divide-rule/70"
              >
                {q.choices.map((c, i) => {
                  const selected = answers[q.id] === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      data-sa-answer
                      aria-current={selected ? "true" : undefined}
                      onClick={() => select(q.id, c.id)}
                      className="group/ans relative flex w-full items-baseline gap-4 rounded-sm py-4 pl-3 pr-2 text-left outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--accent)/0.45)] sm:gap-6 sm:py-5 sm:pl-4"
                    >
                      {/* Cyan side tick — marks the previously chosen answer
                          on back-nav (the family's active-row tick). */}
                      <span
                        aria-hidden="true"
                        className={`absolute left-0 top-1/2 h-[1.15em] w-[2px] -translate-y-1/2 bg-accent transition-opacity duration-200 motion-reduce:transition-none ${
                          selected ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      <span
                        className={`font-mono text-[11px] tracking-[0.22em] transition-colors duration-200 motion-reduce:transition-none ${
                          selected
                            ? "text-accent"
                            : "text-accent/50 group-hover/ans:text-accent group-focus-visible/ans:text-accent"
                        }`}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={`text-base leading-[1.45] sm:text-lg transition-colors duration-200 motion-reduce:transition-none ${
                          selected
                            ? "text-ink"
                            : "text-ink-mute group-hover/ans:text-ink group-focus-visible/ans:text-ink"
                        }`}
                      >
                        {isEn ? c.labelEn : c.labelIt}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {phase === "result" && (
            <div>
              <h3
                data-sa-result-heading
                tabIndex={-1}
                className="font-display text-[clamp(1.75rem,3.2vw,2.75rem)] leading-[1.15] tracking-[-0.02em] text-ink text-balance pb-1 outline-none"
              >
                {findings.length > 0 ? (
                  resultHeading
                ) : isEn ? (
                  "Nothing urgent surfaced."
                ) : (
                  "Non è emerso nulla di urgente."
                )}
              </h3>

              {findings.length > 0 ? (
                <ol className="mt-8 list-none border-t border-rule/70">
                  {findings.map((f, i) => (
                    <li
                      key={f.id}
                      data-sa-finding
                      className="border-b border-rule/70 py-6 sm:py-7"
                    >
                      <div className="flex items-baseline justify-between gap-4">
                        <p className="font-mono text-[11px] tracking-[0.22em] text-accent">
                          {String(i + 1).padStart(2, "0")}
                        </p>
                        {/* Effort string verbatim from the findings bank. */}
                        <p className="font-mono text-[11px] tracking-[0.14em] text-ink-mute">
                          {isEn ? f.effortEn : f.effortIt}
                        </p>
                      </div>
                      <h4 className="mt-2 font-display text-xl leading-[1.2] tracking-[-0.015em] text-ink sm:text-2xl">
                        {isEn ? f.nameEn : f.nameIt}
                      </h4>
                      <p className="mt-2 max-w-xl text-[15px] leading-[1.6] text-ink-mute sm:text-base">
                        {isEn ? f.descEn : f.descIt}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-6 max-w-xl text-[15px] leading-[1.6] text-ink-mute sm:text-base">
                  {isEn
                    ? "These five answers raised no urgent flags. That happens — five questions only go so far."
                    : "Queste cinque risposte non hanno fatto emergere nulla di urgente. Succede — cinque domande arrivano fino a un certo punto."}
                </p>
              )}

              {/* Closing bridge to the real thing — grounded in the page's
                  own hero copy (a week inside, a written report). */}
              <p className="mt-8 max-w-xl text-[15px] leading-[1.6] text-ink-mute sm:text-base">
                {isEn
                  ? "That was the 60-second read. The real audit is a week inside your systems, with a written report at the end."
                  : "Questa era la lettura in 60 secondi. L'audit vero è una settimana dentro i vostri sistemi, con un report scritto alla fine."}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
                {/* Link to the page's existing CTA target — not a new form. */}
                {/* Both result actions carry HIT_PAD + `-my-3.5`: the padded
                    boxes clear 44px while each flex line keeps the cross-size
                    it had before, so `gap-y-4` between wrapped rows and the
                    row's own height are untouched. */}
                <a
                  href="#book-call"
                  className="group/cta relative -my-3.5 inline-flex items-center gap-1.5 rounded-sm py-3.5 font-mono text-[12px] uppercase tracking-[0.18em] text-accent outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--accent)/0.45)]"
                >
                  {isEn ? "Book a scoping call" : "Prenota una call di scoping"}
                  <span
                    aria-hidden="true"
                    className="transition-transform duration-200 group-hover/cta:translate-x-0.5 group-focus-visible/cta:translate-x-0.5 motion-reduce:transition-none"
                  >
                    →
                  </span>
                  {/* bottom-3, not -bottom-0.5 — same 0.125rem gap under the
                      text once HIT_PAD is inside the box. */}
                  <span
                    aria-hidden="true"
                    className="absolute bottom-3 left-0 h-px w-full origin-left scale-x-0 bg-accent/80 transition-transform duration-300 ease-out group-hover/cta:scale-x-100 group-focus-visible/cta:scale-x-100 motion-reduce:transition-none"
                  />
                </a>
                <button
                  type="button"
                  onClick={reset}
                  className="-my-3.5 rounded-sm py-3.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-mute outline-none transition-colors duration-200 hover:text-ink focus-visible:text-ink focus-visible:ring-1 focus-visible:ring-[hsl(var(--accent)/0.45)] motion-reduce:transition-none"
                >
                  {isEn ? "Run again" : "Ricomincia"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
