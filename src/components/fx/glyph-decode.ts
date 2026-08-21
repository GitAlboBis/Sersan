/**
 * scrambleDecode — a one-shot, timeline-sequenced AT-style glyph decode for
 * small DOM targets (the LabelScrambler treatment, fired locally so it lands
 * exactly when its owner's reveal timeline says so — and so the targets keep
 * their own type styling instead of inheriting the unlayered `.eyebrow` CSS).
 *
 * Extracted verbatim from fx/stream-pane.tsx (`scramblePaneEyebrow`) in the
 * round-3 de-card pass (2026-08-21): the glass panes died, but the decode now
 * runs on the ledger rows' GHOST display words (problem's effect word,
 * production's claim line) as their masked rise lands.
 *
 * Same safety contract as the global engine:
 *   - walks TEXT NODES only (aria-hidden decorations — `·` and `->` spans —
 *     never scramble), preserving React's DOM verbatim;
 *   - aria-label holds the real string for the whole run;
 *   - aborts on any external write (EN/IT swap mid-decode) leaving React's
 *     fresh text untouched;
 *   - stops if the element disconnects (route change);
 *   - once per element per page life; RM = no-op.
 */

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const SCRAMBLE_MS = 480;
const TICK_MS = 40;

function isStructuralChar(ch: string): boolean {
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

interface ScrambleNodeRecord {
  node: Text;
  final: string[];
  written: string;
  offset: number;
}

function collectScrambleNodes(el: HTMLElement): ScrambleNodeRecord[] {
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
  const records: ScrambleNodeRecord[] = [];
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

export function scrambleDecode(el: HTMLElement): void {
  if (prefersReducedMotion()) return;
  if (el.dataset.glyphDecoded === "1") return;
  el.dataset.glyphDecoded = "1";

  const records = collectScrambleNodes(el);
  const totalChars = records.reduce((sum, r) => sum + r.final.length, 0);
  if (totalChars === 0) return;

  const finalText = (el.textContent ?? "").trim();
  el.setAttribute("aria-label", finalText);

  const start = performance.now();
  const stop = (completed: boolean) => {
    window.clearInterval(tick);
    records.forEach((r) => {
      // Completed → restore byte-identical. Aborted (external write) →
      // restore only nodes WE still own; React's fresh text stays.
      if (completed || r.node.nodeValue === r.written) {
        r.node.nodeValue = r.final.join("");
      }
    });
    el.removeAttribute("aria-label");
  };

  const tick = window.setInterval(() => {
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
    const settled = Math.floor(progress * totalChars);
    for (const r of records) {
      let out = "";
      for (let i = 0; i < r.final.length; i++) {
        const ch = r.final[i];
        if (isStructuralChar(ch) || r.offset + i < settled) {
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
}
