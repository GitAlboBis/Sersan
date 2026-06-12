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
 * Composite eyebrows (a decorative dot/status-dot/rule <span> next to the text,
 * the dominant page-hero idiom) are fully supported: the scramble walks the
 * element's TEXT NODES and mutates their `nodeValue` in place, so decorative
 * element children are never touched and the DOM structure React rendered is
 * preserved verbatim. The settle boundary sweeps left-to-right across ALL text
 * nodes in document order, so multi-node labels decode as one string.
 *
 * The lone exception is SectionHeading's eyebrow ([data-eyebrow-text]): that
 * component animates its own eyebrow (rule-line scaleX + text fade), so it is
 * explicitly skipped here — one reveal owner per element, never two.
 *
 * Accessibility / SSR:
 *   - SSR and the pre-observe DOM always contain the REAL text (we never touch
 *     server output). The scramble only mutates text nodes on the client, after
 *     the element is in view.
 *   - The element gets aria-label = the real text for the whole animation, so
 *     the accessible name is the final string and a screen reader never reads
 *     the transient gibberish. The label is removed once the text settles.
 *   - prefers-reduced-motion: no scramble at all — the static text stays.
 *   - Runs ONCE per element (unobserved after it settles).
 *
 * React safety: because we mutate the SAME text nodes React created (no
 * replaceChildren / no wrapper spans), React's reconciler keeps working — an
 * EN/IT toggle simply writes the new string into the node. If that happens
 * mid-decode we detect the external write (nodeValue no longer matches what we
 * last wrote) and abort immediately, leaving React's fresh text untouched.
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

// One scrambling text node: the final glyphs, the last string WE wrote (to
// detect external writes, i.e. a React language swap mid-decode), and the
// node's character offset within the whole label (for the global L→R sweep).
interface NodeRecord {
  node: Text;
  final: string[];
  written: string;
  offset: number;
}

// Collect the element's non-empty text nodes in document order, skipping any
// inside aria-hidden subtrees (decorative children own no label text; if one
// ever carries visible glyphs — e.g. a middot span — it must stay static).
function collectTextNodes(el: HTMLElement): NodeRecord[] {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!(node.nodeValue ?? "").trim()) return NodeFilter.FILTER_REJECT;
      let parent = node.parentElement;
      while (parent && parent !== el) {
        if (parent.getAttribute("aria-hidden") === "true") {
          return NodeFilter.FILTER_REJECT;
        }
        parent = parent.parentElement;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const records: NodeRecord[] = [];
  let offset = 0;
  let current: Node | null;
  while ((current = walker.nextNode())) {
    const text = current as Text;
    const value = text.nodeValue ?? "";
    const final = Array.from(value);
    records.push({ node: text, final, written: value, offset });
    offset += final.length;
  }
  return records;
}

export function LabelScrambler() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    // Track in-flight runs so a route change / unmount can stop them and
    // restore the real text immediately (no half-decoded labels left behind).
    const running = new Map<
      HTMLElement,
      { tick: number; records: NodeRecord[] }
    >();

    const scramble = (el: HTMLElement) => {
      if (el.dataset.scrambleDone === "1") return;
      el.dataset.scrambleDone = "1";

      // Snapshot the real text nodes before any mutation — works for leaf
      // eyebrows (one node) and composites (dot span + text, multiple nodes).
      const records = collectTextNodes(el);
      const totalChars = records.reduce((sum, r) => sum + r.final.length, 0);
      if (totalChars === 0) return;

      // Keep the accessible name = the real string for the whole animation,
      // so assistive tech never reads the transient gibberish.
      const finalText = (el.textContent ?? "").trim();
      el.setAttribute("aria-label", finalText);

      const start = performance.now();
      const stop = (completed: boolean) => {
        window.clearInterval(tick);
        running.delete(el);
        records.forEach((r) => {
          // On completion restore every node byte-identical to what React
          // rendered. On abort (external write detected, e.g. React swapping
          // the language mid-decode) restore only the nodes WE still own:
          // multi-node labels ("ISO 27001 " + ternary + " · DORA …") get only
          // their CHANGED node rewritten by React, so the untouched siblings
          // would otherwise be stranded as frozen gibberish.
          if (completed || r.node.nodeValue === r.written) {
            r.node.nodeValue = r.final.join("");
          }
        });
        el.removeAttribute("aria-label");
      };

      const tick = window.setInterval(() => {
        // External write detection: if React (EN/IT toggle) or anything else
        // touched a node since our last write, abandon the decode and leave
        // the fresh text alone — never clobber a language swap.
        for (const r of records) {
          if (r.node.nodeValue !== r.written) {
            stop(false);
            return;
          }
        }
        if (!el.isConnected) {
          stop(false);
          return;
        }

        const progress = Math.min(1, (performance.now() - start) / SCRAMBLE_MS);
        // Reveal left-to-right ACROSS the whole label: characters before the
        // moving "settle" boundary are locked to their final glyph; the rest
        // keep cycling. Gives a clean decode sweep rather than uniform noise.
        const settled = Math.floor(progress * totalChars);
        for (const r of records) {
          let out = "";
          for (let i = 0; i < r.final.length; i++) {
            const ch = r.final[i];
            if (isStructural(ch) || r.offset + i < settled) {
              out += ch;
            } else {
              out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
            }
          }
          r.node.nodeValue = out;
          r.written = out;
        }
        if (progress >= 1) {
          stop(true);
        }
      }, TICK_MS);
      running.set(el, { tick, records });
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
      if (el.querySelector("[data-eyebrow-text]")) {
        // SectionHeading eyebrow — its own cascade (rule scaleX + text fade)
        // owns the reveal; one animation owner per element. Don't re-check it.
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
      // Settle any in-flight decode on its real text before leaving.
      running.forEach(({ tick, records }, el) => {
        window.clearInterval(tick);
        records.forEach((r) => {
          r.node.nodeValue = r.final.join("");
        });
        el.removeAttribute("aria-label");
      });
      running.clear();
    };
  }, []);

  return null;
}
