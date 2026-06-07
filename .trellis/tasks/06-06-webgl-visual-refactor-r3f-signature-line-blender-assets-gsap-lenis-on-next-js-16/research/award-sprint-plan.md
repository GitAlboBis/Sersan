# Award Sprint — Implementation Plan (2026-06-07, carte blanche #2)

User mandate: full freedom on UI (copy/references untouched). Card motion,
Blender 3D, anything. Target: Lusion-grade cohesion.

Diagnosis: hero/line/transitions are award-level; the INNER sections still
read static. The gaps, in impact order:

## Phase A — Card physicality (user-requested "animazioni delle card")
Global pointer-delegation controller (`fx/card-tilt-controller.tsx`,
mounted once in layout): every `.card-steel` gets 3D tilt toward the
cursor (max ~6°, transformPerspective), micro-lift, and a radial sheen
that tracks the pointer (CSS vars + `.card-steel::after` overlay).
Zero per-section edits. Fine-pointer only; inert under reduced-motion.

## Phase B — Editorial heading choreography
GSAP SplitText (free since Webflow) line-mask reveals on the marquee
Fraunces headings: lines rise out of a mask on scroll-enter, staggered.
Opt-in via `data-split-reveal` on ~6 statement headings (controlled
blast radius). Controller keyed on language + pathname (EN/IT re-split,
the recon's desync risk handled by construction). `mask: "lines"`.

## Phase C — Blender gateway at the Final CTA (user-requested 3D model)
The signature line's last waypoint resolves to center at the CTA. Build
the moment it lands in: a machined double-ring "gateway" modeled in
Blender (diamond cross-section ring via 4-segment minor torus +
auto-smooth, plus a thin inner counter-ring), exported GLB (~tens of KB),
optimized, world-anchored at the `final-cta` span in the persistent
canvas. The line threads through the gate; rings counter-rotate slowly;
inner ring emissive >1 rides the bloom. Narrative close: the signal
passes the gate → book the call.
Pipeline per the Blender asset protocol: scene check → build → viewport
screenshot → export → gltf-transform → R3F.

## Phase D — Custom cursor (AGENTS.md §3c optional, the award signature)
Dot + lagging ring (quickTo), ring swells on interactive elements
(pointerover delegation on a/button), native cursor hidden except form
fields. Desktop fine-pointer only; reduced-motion → never mounts.

## Sequencing & guardrails
A → C → B → D, commit + visual QA per phase. tsc must stay green.
No copy edits anywhere. Existing Reveal fade-ups stay (tilt is hover-only,
split-reveal only on marked headings — no double-animation mush).
