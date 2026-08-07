"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";

/**
 * HonestFaq — the /audit "Honest answers" FAQ as a hairline-divider
 * accordion, replacing the stack of seven card-steel boxes. Every Q+A
 * string is passed in from audit-client byte-identical (EN and IT).
 *
 * MACHINERY — the same Radix accordion the site already ships
 * (@radix-ui/react-accordion, wrapped by src/components/ui/accordion.tsx and
 * used by consulting's FAQ). Built directly on the primitive here — same
 * pattern, same semantics — because the shared wrapper can't express two
 * things this redesign needs:
 *   1. `forceMount` on Content: the wrapper unmounts closed answers, so
 *      SSR/no-JS would ship a DOM with six of seven answers missing. With
 *      forceMount every answer is in the SSR HTML, height-clipped closed —
 *      the SurfacesLedger contract (clipped, never display:none, so screen
 *      readers and crawlers always get the full content).
 *   2. its outer Content element hard-codes its classes (and the codebase
 *      defines no accordion keyframes), so there is no seam to attach an
 *      open/close animation. Here the outer Content is a CSS grid whose
 *      grid-template-rows transitions 0fr→1fr under var(--ease-entrance) —
 *      the site's height-clip ease (GSAP expo.out's CSS twin), animating
 *      both open AND close without measuring. motion-reduce: transition-none.
 *
 * VISUAL — no card fills: hairline rules only (border-t on the root,
 * border-b per item), the question in the display serif at text-lg/xl, and a
 * mono "+" indicator that rotates 45° into an "×" when open (replaces the
 * wrapper's hard-coded ChevronDown SVG).
 *
 * A11Y / KEYBOARD — all Radix defaults, unfought: Header renders an h3
 * (matching the retired cards' h3 questions), Trigger is a real button with
 * aria-expanded/aria-controls, Content is the labelled region, and the Root
 * provides Arrow/Home/End roving focus plus Enter/Space toggling. Answers
 * hold no focusable elements, so the clipped-closed state traps nothing.
 *
 * Items use stable index-based values/keys so an EN↔IT toggle swaps text in
 * place — an open item stays open across a language switch.
 */

type Faq = { q: string; a: string };

export function HonestFaq({ faqs }: { faqs: Faq[] }) {
  return (
    <AccordionPrimitive.Root type="single" collapsible className="border-t border-rule/70">
      {faqs.map((f, i) => (
        <AccordionPrimitive.Item
          key={`faq-${i}`}
          value={`faq-${i}`}
          className="border-b border-rule/70"
        >
          <AccordionPrimitive.Header className="flex">
            <AccordionPrimitive.Trigger className="group flex flex-1 items-baseline justify-between gap-6 rounded-sm py-6 text-left outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--accent)/0.45)]">
              <span className="font-display text-lg leading-snug text-ink transition-colors group-hover:text-[hsl(var(--accent))] group-data-[state=open]:text-[hsl(var(--accent))] sm:text-xl">
                {f.q}
              </span>
              {/* Mono plus — rotates into an × when the answer is open. */}
              <span
                aria-hidden="true"
                className="shrink-0 font-mono text-lg leading-none text-accent transition-transform duration-300 ease-[var(--ease-entrance)] group-data-[state=open]:rotate-45 motion-reduce:transition-none"
              >
                +
              </span>
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          {/* forceMount + grid-rows height-clip: answer always in the DOM,
              opens/closes on the site's entrance ease. */}
          <AccordionPrimitive.Content
            forceMount
            className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-500 ease-[var(--ease-entrance)] data-[state=open]:grid-rows-[1fr] motion-reduce:transition-none"
          >
            <div className="min-h-0 overflow-hidden">
              <p className="pb-6 pr-8 text-sm leading-relaxed text-muted-foreground/75 sm:pr-12 sm:text-base">
                {f.a}
              </p>
            </div>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
}
