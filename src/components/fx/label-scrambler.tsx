"use client";

/**
 * LabelScrambler — mono eyebrow/label "decode" reveal (award sprint, kinetic
 * typography).
 *
 * Every `.eyebrow` element on the site (the small JetBrains-Mono uppercase tags
 * — "Selected work", "Field notes", "01 / Signals", "Six surfaces · one week",
 * …) gets a brief, tasteful character-scramble when it first scrolls into view:
 * each glyph cycles through a mono glyph set for ~0.45s, then settles on the
 * real character. It reads as technical micro-copy *decoding*, not a glitch toy.
 *
 * DRY by construction: ONE delegated IntersectionObserver mounted in the root
 * layout watches every `.eyebrow` (existing and route-added), so no per-element
 * listeners and no per-section wiring. Removing this single component removes
 * the whole effect — the labels just render their static text.
 *
 * Accessibility / SSR:
 *   - SSR and the pre-observe DOM always contain the REAL text (we never touch
 *     server output). The scramble only mutates a private visual span on the
 *     client, after the element is in view.
 *   - The element gets aria-label = the real text and the visual span is
 *     aria-hidden, so the accessible name is the final string for the entire
 *     animation (and a screen reader never reads the transient gibberish).
 *   - prefers-reduced-motion: no scramble at all — the static text stays.
 *   - Runs ONCE per element (unobserved after it settles).
 *
 * Cooperates with the rest of the motion system: `.eyebrow` is mono micro-copy,
 * not a heading (`data-split-reveal`) nor a card body, so this never
 * double-animates an element another reveal already owns. The visual span keeps
 * the eyebrow's own opacity/transform reveals (RevealOnScroll) intact — those
 * animate the parent; this only swaps text content inside it.
 *
 * Composite eyebrows are SKIPPED. Some eyebrows (notably SectionHeading's, and
 * a few in who-and-why) wrap their text in child <span>s (a decorative rule
 * line, an accent middot, a [data-eyebrow-text] node that SectionHeading itself
 * already reveals). Replacing their children would destroy that structure and
 * collide with SectionHeading's own eyebrow animation. So we only scramble
 * "leaf" eyebrows: those whose direct content is a single text node.
 */
import { useEffect } from "react";

// Mono "decode" alphabet — uppercase A–Z, digits, and the two separators the
// real eyebrows use. Spaces/punctuation in the target are preserved verbatim so
// word shape and length never shift (no layout jitter).
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const SCRAMBLE_MS = 480; // total decode duration — short and quiet
const TICK_MS = 40; // glyph-cycle cadence (~12 frames over the run)

// A character is "structural" when it must never scramble: whitespace keeps
// word gaps (incl. the non-breaking space), and the dividers used in eyebrows
// like "01 / SIGNALS" or "SIX SURFACES · ONE WEEK" stay put. Checked by code
// point so the nbsp / middot are unambiguous.
function isStructural(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return (
    code === 0x20 || // space
    code === 0x09 || // tab
    code === 0x0a || // newline
    code === 0x0d || // carriage return
    code === 0x00a0 || // non-breaking space
    code === 0x00b7 || // middot ·
    ch === "/" ||
    ch === "-"
  );
}

// A "leaf" eyebrow has no element children — its content is plain text we can
// safely swap. Composite eyebrows (with <span> rules / accent dots / a
// SectionHeading [data-eyebrow-text]) are left to their own reveals.
function isLeafEyebrow(el: HTMLElement): boolean {
  return el.childElementCount === 0;
}

export function LabelScrambler() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    // Track in-flight intervals so a route change / unmount can stop them and
    // restore the real text immediately (no half-decoded labels left behind).
    const running = new Map<HTMLElement, number>();

    const scramble = (el: HTMLElement) => {
      if (el.dataset.scrambleDone === "1") return;
      // Read once, before any DOM swap, so the source is always the real text
      // (even after an EN/IT language swap re-renders the label in place).
      const finalText = (el.textContent ?? "").trim();
      if (!finalText) {
        el.dataset.scrambleDone = "1";
        return;
      }
      el.dataset.scrambleDone = "1";

      // Keep the accessible name = the real string for the whole animation, and
      // hide the transiently-mutated visual text from assistive tech.
      el.setAttribute("aria-label", finalText);
      const visual = document.createElement("span");
      visual.setAttribute("aria-hidden", "true");
      visual.textContent = finalText; // start from final (no flash of blank)
      el.replaceChildren(visual);

      const chars = Array.from(finalText);
      const start = performance.now();
      const tick = window.setInterval(() => {
        const progress = Math.min(1, (performance.now() - start) / SCRAMBLE_MS);
        // Reveal left-to-right: characters before the moving "settle" boundary
        // are locked to their final glyph; the rest keep cycling. Gives a clean
        // decode sweep rather than uniform noise.
        const settled = Math.floor(progress * chars.length);
        let out = "";
        for (let i = 0; i < chars.length; i++) {
          const ch = chars[i];
          if (isStructural(ch) || i < settled) {
            out += ch;
          } else {
            out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
          }
        }
        visual.textContent = out;
        if (progress >= 1) {
          window.clearInterval(tick);
          running.delete(el);
          // Hand the real text back to a plain text node so the DOM is exactly
          // as it started (and a later language swap reconciles cleanly).
          el.removeChild(visual);
          el.textContent = finalText;
          el.removeAttribute("aria-label");
        }
      }, TICK_MS);
      running.set(el, tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            io.unobserve(el); // once per element
            scramble(el);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.4 },
    );

    // Observe everything present now, then keep watching for labels added by
    // client route changes via a MutationObserver — no querySelectorAll sweeps
    // on a timer, no per-element wiring.
    const tryObserve = (el: HTMLElement) => {
      if (el.dataset.scrambleDone === "1") return;
      if (!isLeafEyebrow(el)) {
        // Composite eyebrow — its own reveal owns it; don't re-check it.
        el.dataset.scrambleDone = "1";
        return;
      }
      io.observe(el);
    };

    const observeAll = (root: ParentNode) => {
      root
        .querySelectorAll<HTMLElement>(".eyebrow")
        .forEach((el) => tryObserve(el));
    };
    observeAll(document);

    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          const el = node as HTMLElement;
          if (el.classList?.contains("eyebrow")) tryObserve(el);
          observeAll(el);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      running.forEach((tick) => window.clearInterval(tick));
      running.clear();
    };
  }, []);

  return null;
}
