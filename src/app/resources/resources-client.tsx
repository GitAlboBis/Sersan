"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight, Clock } from "lucide-react";
import { resources, type Resource } from "@/data/resources";
import { useLanguage } from "@/components/language-provider";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import {
  useResourcePreview,
  ResourcePreviewCard,
  type ResourceItemHandlers,
} from "@/components/resources/resource-preview";

export function ResourcesClient() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const { getItemHandlers, onListPointerLeave } = useResourcePreview();

  const categoryLabel: Record<string, string> = isEn
    ? {
        article: "Article",
        guide: "Guide",
        "case-study": "Case study",
        whitepaper: "Whitepaper",
      }
    : {
        article: "Articolo",
        guide: "Guida",
        "case-study": "Case study",
        whitepaper: "Whitepaper",
      };

  const dateLocale = isEn ? "en-GB" : "it-IT";

  return (
    <div className="min-h-screen text-foreground relative">
      {/* Hero */}
      <section data-line-anchor="hero" className="pt-24 pb-16 md:pb-24 relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <div
            className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[75vw] h-[36vw] max-w-[1000px] max-h-[560px] blur-3xl opacity-25"
            style={{ background: "radial-gradient(closest-side, hsl(var(--accent) / 0.22), transparent 70%)" }}
          />
        </div>
        <div className="container-px relative z-10">
          {/* H1 outside the Reveal: the choreographer's line-mask reveal owns
              it (data-split-reveal) — no double animation. Eyebrow entrance =
              LabelScrambler decode; the sub keeps the Reveal fade. */}
          <div className="max-w-3xl mx-auto text-center">
            <p className="eyebrow mb-6 inline-flex items-center justify-center gap-2">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: "hsl(var(--accent))" }}
                aria-hidden="true"
              />
              {isEn ? "Field notes" : "Appunti dal campo"}
            </p>
            {/* key={language}: SplitText owns this subtree once split; a language
                swap must remount it or React reconciles against orphaned nodes
                (same contract as SectionHeading's h2). */}
            <h1 key={language} data-split-reveal className="font-display text-[clamp(2.25rem,7vw,4.5rem)] leading-[1.15] tracking-[-0.025em] text-ink text-balance mb-8 pb-1">
              {isEn ? (
                <>
                  What we&apos;ve learned{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    shipping.
                  </span>
                </>
              ) : (
                <>
                  Cosa abbiamo imparato{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    portando in produzione.
                  </span>
                </>
              )}
            </h1>
            <Reveal delay={150}>
              <p className="text-lg md:text-xl text-ink-mute max-w-xl mx-auto leading-[1.5]">
                {isEn
                  ? "No frameworks-of-frameworks. Just what worked, what failed, and why."
                  : "Niente framework di framework. Solo cosa ha funzionato, cosa è andato male e perché."}
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Articles list */}
      <section data-line-anchor="list" className="pb-24">
        <div className="container-px">
          <div
            className="max-w-4xl mx-auto space-y-5"
            onPointerLeave={onListPointerLeave}
          >
            {/* ResourceCard COMPOSES the preview-store handlers (WebGL hover
                plane / DOM fallback card wiring) with the card-surface hover
                lens + click radial wipe — it wraps getItemHandlers(i), never
                replaces it. */}
            {resources.map((r, i) => (
              <Reveal key={r.slug} delay={Math.min(i, 4) * 70}>
                <ResourceCard
                  r={r}
                  index={i}
                  isEn={isEn}
                  categoryLabel={categoryLabel}
                  dateLocale={dateLocale}
                  preview={getItemHandlers(i)}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Ritual gap — transparent negative space so the persistent canvas
          (z-0) shows through; the route's 3D ritual object world-anchors
          here and the signature line threads it before the CTA. */}
      <div data-line-anchor="ritual" aria-hidden="true" className="py-28 sm:py-40" />

      {/* Closing CTA — a REAL section (BEAT 3) so the signature line gets a
          genuine terminus band instead of dying in the void. Copy + structure
          reuse the /case-studies closing CTA verbatim (frozen EN/IT strings);
          giving final-cta real height shifts its measured center fraction down
          the document, fixing the curve tail via the existing waypoint (no
          routeCurves edit). */}
      <section data-line-anchor="final-cta" className="section-lg relative">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] opacity-20 pointer-events-none"
          aria-hidden="true"
        >
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,hsl(var(--accent))_0%,transparent_60%)] blur-[140px]" />
        </div>
        <div className="container-px relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            {/* SectionHeading owns the line-mask reveal AND carries
                key={language} on its internal h2 (data-heading-title) — adding
                data-split-reveal here would double-animate the title via
                HeadingChoreographer, so we reuse the /case-studies pattern as-is. */}
            <SectionHeading
              align="center"
              className="mx-auto mb-10 max-w-2xl"
              title={
                isEn ? (
                  <>
                    Want this kind of work in{" "}
                    <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                      your business?
                    </span>
                  </>
                ) : (
                  <>
                    Volete questo tipo di lavoro nella{" "}
                    <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                      vostra azienda?
                    </span>
                  </>
                )
              }
              description={
                isEn
                  ? "A free scoping call is the easiest way to find out where it would have the highest impact."
                  : "Una call di scoping gratuita è il modo più semplice per capire dove avrebbe l'impatto maggiore."
              }
            />
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button asChild size="lg" className="px-10 py-7 text-base font-semibold rounded-full">
                <Link href="/audit">
                  {isEn ? "Book a scoping call" : "Prenota una call di scoping"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* DOM/CSS fallback hover-preview card (BEAT 3). Renders only on the
          non-WebGPU paths (lite tier / flag-off desktop); suppressed on the
          desktop WebGPU full path where ResourcePreviewPlane is the preview,
          and on coarse/reduced-motion. */}
      <ResourcePreviewCard />

      {/* Card lens/wipe styles — see CARD_FX_CSS docs below. Static string,
          so SSR and client markup are identical. */}
      <style>{CARD_FX_CSS}</style>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Article card — hover lens + click radial wipe (template 4, demos 2 + 1)   */
/* ------------------------------------------------------------------------- */

/**
 * True only where the lens/wipe may run: a fine pointer with real hover and no
 * reduced-motion preference. The CSS media block hides the layers on the other
 * paths anyway — this JS gate just skips the per-event work (rect caching, CSS
 * var writes, wipe arming) on coarse / reduced-motion devices.
 */
function cardFxOn() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

interface ResourceCardProps {
  r: Resource;
  index: number;
  isEn: boolean;
  categoryLabel: Record<string, string>;
  dateLocale: string;
  /** resourcePreviewStore handlers from useResourcePreview — the WebGL hover
   *  preview plane (and its DOM fallback card) are driven by these. The lens
   *  and wipe live on the card surface itself and COMPOSE with this wiring;
   *  the DOM stays the complete experience when the plane doesn't mount. */
  preview: ResourceItemHandlers;
}

/**
 * One /resources article card.
 *
 * HOVER LENS (demo 2) — a circular influence follows the pointer, revealing an
 * aria-hidden "hot" duplicate of the card copy (accent-cyan tint + dot grid
 * lighting up) through a radial-gradient mask centered at --mx/--my.
 * pointermove writes the vars in card-local px against a rect cached ONCE per
 * pointerenter (no rect reads in any frame loop; the pointer stays inside the
 * card, so scroll recompute is unnecessary). Only the radius eases — via the
 * registered `--lens-r` @property transition (opens on enter, collapses on
 * leave).
 *
 * CLICK WIPE (demo 1) — on a plain left click, a clip-path circle() floods the
 * card from the click point with a corner-max-normalized radius, so coverage
 * always completes regardless of origin. Passive: NO preventDefault — the wipe
 * is a confirmation flourish and <Link> navigation proceeds natively (same
 * arming contract as use-flip-source).
 */
function ResourceCard({
  r,
  index,
  isEn,
  categoryLabel,
  dateLocale,
  preview,
}: ResourceCardProps) {
  const rectRef = useRef<DOMRect | null>(null);
  const lastRef = useRef({ x: -1, y: -1 });
  const wipeRef = useRef<HTMLDivElement | null>(null);

  const writeLensVars = (el: HTMLElement, clientX: number, clientY: number) => {
    const rect = rectRef.current;
    if (!rect) return;
    const x = Math.round(clientX - rect.left);
    const y = Math.round(clientY - rect.top);
    const last = lastRef.current;
    if (x === last.x && y === last.y) return; // identical-value skip
    last.x = x;
    last.y = y;
    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);
  };

  const onPointerEnter = (e: React.PointerEvent<HTMLAnchorElement>) => {
    preview.onPointerEnter(e);
    if (e.pointerType === "touch" || !cardFxOn()) return;
    // ONE rect read per pointerenter — cached for every move/click after it.
    rectRef.current = e.currentTarget.getBoundingClientRect();
    lastRef.current.x = -1;
    lastRef.current.y = -1;
    writeLensVars(e.currentTarget, e.clientX, e.clientY);
    // A fresh hover clears any flood left by a completed flourish (e.g.
    // back/forward restore) — reset without transitioning.
    const wipe = wipeRef.current;
    if (wipe) {
      wipe.style.transition = "none";
      wipe.style.opacity = "0";
      wipe.style.clipPath = "circle(0px at 50% 50%)";
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLAnchorElement>) => {
    preview.onPointerMove(e);
    writeLensVars(e.currentTarget, e.clientX, e.clientY);
  };

  const onPointerLeave = (e: React.PointerEvent<HTMLAnchorElement>) => {
    preview.onPointerLeave(e);
    rectRef.current = null; // lens collapse is pure CSS (:hover ends)
  };

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Same contract as use-flip-source: plain same-tab left clicks only;
    // modified clicks and keyboard activation navigate with no flourish.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
      return;
    if (e.detail === 0) return; // keyboard "click"
    if (!cardFxOn()) return;
    const wipe = wipeRef.current;
    if (!wipe) return;
    const rect = rectRef.current ?? e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Corner-max-normalized radius (template 4 demo 1): the largest distance
    // from the click point to any card corner — the flood always completes.
    const maxR = Math.ceil(
      Math.max(
        Math.hypot(x, y),
        Math.hypot(rect.width - x, y),
        Math.hypot(x, rect.height - y),
        Math.hypot(rect.width - x, rect.height - y),
      ),
    );
    wipe.style.setProperty("--wx", `${Math.round(x)}px`);
    wipe.style.setProperty("--wy", `${Math.round(y)}px`);
    wipe.style.transition = "none";
    wipe.style.opacity = "1";
    wipe.style.clipPath = `circle(0px at ${x}px ${y}px)`;
    // One-off style flush (a click handler, NOT a frame loop) so the
    // expansion transitions from radius 0 instead of jumping.
    void wipe.offsetWidth;
    wipe.style.transition = "clip-path 0.45s cubic-bezier(0.19, 1, 0.22, 1)";
    wipe.style.clipPath = `circle(${maxR}px at ${x}px ${y}px)`;
    // NO preventDefault — navigation proceeds natively.
  };

  return (
    <Link
      href={`/resources/${r.slug}`}
      data-resource-index={index}
      className="resource-card card-steel group block p-7"
      onPointerEnter={onPointerEnter}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onClick={onClick}
    >
      <CardBody
        r={r}
        isEn={isEn}
        categoryLabel={categoryLabel}
        dateLocale={dateLocale}
      />
      {/* Hot duplicate revealed through the lens mask. aria-hidden +
          pointer-events-none: purely decorative, same strings from the same
          data (copy byte-identical), identical layout classes so it overlays
          the base copy pixel-exact (p-7 mirrors the Link's padding). */}
      <div aria-hidden="true" className="resource-lens p-7">
        <CardBody
          r={r}
          isEn={isEn}
          categoryLabel={categoryLabel}
          dateLocale={dateLocale}
          hot
        />
      </div>
      {/* Click-wipe flood layer (clip-path circle written inline on click). */}
      <div ref={wipeRef} aria-hidden="true" className="resource-wipe" />
    </Link>
  );
}

/**
 * Card copy, rendered twice per card: once as the real (semantic) content and
 * once as the aria-hidden "hot" duplicate inside the lens mask. Layout classes
 * are IDENTICAL in both variants — `hot` only swaps colors (the inline style
 * wins over the utility color) so the duplicate sits pixel-exact over the
 * base. The hot arrow keeps the same group-hover translate so both copies
 * shift together while hovered.
 */
function CardBody({
  r,
  isEn,
  categoryLabel,
  dateLocale,
  hot = false,
}: {
  r: Resource;
  isEn: boolean;
  categoryLabel: Record<string, string>;
  dateLocale: string;
  hot?: boolean;
}) {
  // The real card keeps the semantic <h2>; the decorative duplicate must not
  // add a second heading to the outline, so it renders a <div> with the same
  // classes (preflight zeroes heading margins/font, so layout is identical).
  const Title = hot ? "div" : "h2";
  return (
    <>
      <div
        className="flex items-center gap-3 mb-3 text-[10px] font-mono uppercase tracking-[0.16em] text-ink-mute"
        style={hot ? { color: "hsl(var(--accent) / 0.85)" } : undefined}
      >
        <span style={{ color: "hsl(var(--accent))" }}>{categoryLabel[r.category]}</span>
        <span aria-hidden="true">·</span>
        <span>
          {new Date(r.publishedAt).toLocaleDateString(dateLocale, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3 h-3" /> {r.readMinutes} min
        </span>
      </div>
      <Title
        className="font-display text-2xl sm:text-[1.75rem] text-ink mb-3 leading-tight"
        style={hot ? { color: "hsl(var(--accent))" } : undefined}
      >
        {isEn ? r.title : r.titleIt}
      </Title>
      <p
        className="text-sm sm:text-base text-ink-mute leading-[1.55] mb-4"
        style={hot ? { color: "hsl(var(--ink))" } : undefined}
      >
        {isEn ? r.excerpt : r.excerptIt}
      </p>
      <div className="flex items-center justify-between">
        <p
          className="text-[11px] font-mono uppercase tracking-[0.14em] text-ink-mute"
          style={hot ? { color: "hsl(var(--accent) / 0.8)" } : undefined}
        >
          {r.authorName} &middot; {isEn ? r.authorRole : r.authorRoleIt}
        </p>
        <ArrowRight
          className="w-4 h-4 text-ink-mute group-hover:text-[hsl(var(--accent))] group-hover:translate-x-0.5 transition-all"
          style={hot ? { color: "hsl(var(--accent))" } : undefined}
        />
      </div>
    </>
  );
}

/**
 * Lens + wipe CSS — CSS-first per the R spec:
 *
 *   - LENS: a masked overlay (radial-gradient mask at --mx/--my in card-local
 *     px). The 55%→98% stop ramp is the smoothstep falloff of the influence
 *     circle; the radius eases through the registered `--lens-r` @property
 *     (discrete open/close where @property is unsupported — the mask still
 *     works). Pure gradients, no filter/blur.
 *   - WIPE: clip-path circle() transition, radius/origin written inline by
 *     the click handler.
 *
 * Both layers are display:none outside the fine-pointer + motion-OK media
 * block (and the lens additionally behind a mask-image @supports gate), so
 * coarse pointers and reduced-motion users keep today's fully static cards
 * while SSR markup stays identical everywhere. Accent is the signal cyan
 * (#3BE1FF via --accent) — no violet.
 */
const CARD_FX_CSS = `
@property --lens-r {
  syntax: "<length>";
  inherits: false;
  initial-value: 0px;
}
.resource-lens,
.resource-wipe {
  display: none;
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
}
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  @supports ((mask-image: radial-gradient(#000, #0000)) or (-webkit-mask-image: radial-gradient(#000, #0000))) {
    .resource-lens { display: block; }
  }
  .resource-wipe { display: block; }
}
.resource-lens {
  --lens-r: 0px;
  transition: --lens-r 0.55s cubic-bezier(0.23, 1, 0.32, 1);
  -webkit-mask-image: radial-gradient(
    circle var(--lens-r) at var(--mx, 50%) var(--my, 50%),
    #000 55%,
    transparent 98%
  );
  mask-image: radial-gradient(
    circle var(--lens-r) at var(--mx, 50%) var(--my, 50%),
    #000 55%,
    transparent 98%
  );
}
.resource-card:hover .resource-lens {
  --lens-r: 260px;
}
.resource-lens::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background:
    radial-gradient(
      circle 260px at var(--mx, 50%) var(--my, 50%),
      hsl(var(--accent) / 0.14),
      transparent 72%
    ),
    radial-gradient(hsl(var(--accent) / 0.2) 1px, transparent 1.5px);
  background-size: auto, 18px 18px;
}
.resource-wipe {
  opacity: 0;
  clip-path: circle(0px at 50% 50%);
  background:
    radial-gradient(
      circle 340px at var(--wx, 50%) var(--wy, 50%),
      hsl(var(--accent) / 0.22),
      transparent 75%
    ),
    hsl(var(--accent) / 0.12);
  box-shadow:
    inset 0 0 0 1px hsl(var(--accent) / 0.6),
    inset 0 0 44px -14px hsl(var(--accent) / 0.45);
}
`;
