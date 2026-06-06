# Homepage 10/10 system pass

Push the homepage from 9 → 10 as ONE conversion-grade editorial system. Do NOT redesign the
brand. Keep: dark navy/black, electric-blue accent, Geist type, technical grid language,
production-systems positioning, high-trust tone. Hero (spine stage 0) is already polished — do
not touch it. The 400vh spine (hero + Signals→Handover) stays as the cinematic intro.

## SHARED SECTION GRAMMAR — every section MUST conform (this is the #1 goal: one system)
- Background: dark navy/black (page `--bg`). Section glow only behind the single most important element.
- Borders: hairline `border-[hsl(var(--rule))]` (~rgba white 0.08). Card radius: `--radius-lg` everywhere.
- Electric blue (`--accent`) used SPARINGLY: active states, key metrics, section numbers, ONE emphasis per section. Everything else ink/ink-mute.
- Eyebrow: mono uppercase, `text-ink-mute`, tracking-wide (the `.eyebrow` class). Section heading: large editorial Geist, weight 600 (use `SectionHeading`).
- Cards: ONE pattern (`card-steel` or a single shared Card look) — same bg opacity, border, radius, padding, and hover (subtle lift + faint blue glow, transition ≤300ms `--ease-entrance`). No per-section bespoke card styles.
- Layout: `container-px` width on every section; consistent generous vertical rhythm (use `.section`/`.section-lg`).
- Copy: NO em/en-dashes (use comma/period/colon). EN + IT both (components via `useLanguage()` isEn; data via `*It`). SSR English.
- Motion: fade-up reveals (`Reveal`/`RevealOnScroll`), `--ease-entrance`, all reduced-motion safe. Nothing flashy.
- Contrast: bump faint paragraph/label text ~10-15% (floor body at `text-ink-mute`, no `/55`-`/70` on real copy).

## REORDER (page.tsx) — minimal
Current is nearly right; only change: render **ProductionGradeSection (artifacts) BEFORE UseCasesSection**.
Final order: Spine → CredibilityStrip → ProblemSection → ServicesSection → ProductionGradeSection →
UseCasesSection → CaseStudiesSection → WorkInProgress → FoundersSection → ProcessSection → FitSection → FinalCTA.

## COPY CHANGES (EN + IT)
- Spine stage 05: "Online" → **"Handover"** (eyebrow "05 / Handover", retitle/keep body sensible). IT: "05 / Handover" (or "Consegna"), adjust body.
- Service #1 rename: "Software Development with AI Integrations" → **"AI-Native Software Development"**.
- Founders (founders-section / founders.ts): roles + bios →
  Alessandro Serratt — "CEO · Commercial Systems Lead": "Owns scoping, proposals, pricing, client communication, and engagement structure from first call to handover. He turns ambiguous business problems into clear technical briefs, fixed scopes, and accountable delivery."
  Michele Sanna — "CPTO · Technical Lead": "Architects and ships AI-powered software in regulated, high-stakes environments. Owns the product build, AI layer, data path, evaluation strategy, and what runs in production."
  (Drop "the generalist of the pair".)
- Fit section: add final line: **"If you're unsure, book the call. We'll tell you quickly, and in writing."**
- Selected work: add small label: **"Selected named work includes SerSan-led builds and prior senior-delivery work by the founding team."**

## PER-SECTION DELTAS (conform to the grammar above)
- **ProblemSection (demo-to-prod gap):** split layout — left = headline ("Most AI projects don't fail at the prototype. They fail two months after.") + paragraph; right = a dark "incident console" panel listing the 3 failure modes (No evals → no signal / No traces → no debugging / No boundaries → no trust) with subtle red/amber warning accents but brand blue dominant. Serious/operational, not decorative. Keep the 3 points.
- **ServicesSection ("Four services. One discipline."):** four equal-height premium cards: service number, title, one sharp positioning sentence, "Typical build includes" → 3-4 compact bullets, "Solves" as a highlighted bottom strip, a small technical icon, a small CTA link. Easier to scan, less text-dense.
- **ProductionGradeSection (SIGNATURE section):** three real artifact panels — `evals/agent_v0.4.3.json`, `trace · request timeline`, `permissions.yaml` — crisp monospace, subtle syntax styling, tiny status labels, restrained animation; on hover reveal a short "why it matters". Keep copy: "Every system ships with a regression set." / "Traceable from input to action." / "Boundaries before features." Make it feel REAL, not pretty.
- **UseCasesSection:** "Which situation are you in?" — each card leads with a recognizable buyer pain (e.g. "Your agent works in demo, but fails in production.", "Your automation stack is duct tape.", "Your models are still trapped in notebooks.", "You're about to commit engineering cycles to an AI product.", "You need readiness before a board, customer, or regulator.", "You need senior AI engineering judgment without hiring a full team.") + a short "SerSan response" line. Direct, clickable.
- **CaseStudiesSection (selected work):** row 1 = three large SerSan-led build cards (SphereNode, Quantex.live, Terra Noa) each with sector, Live/In-production status, one-sentence outcome, 2-3 hard metrics, tech-stack chips, live link. row 2 = compact senior-delivery archive (current secondary cards), filterable by sector if cheap. Add the trust label above. Engineering-portfolio feel, less wall-of-cards.
- **FoundersSection:** two-principal studio block; make the split crystal clear (Alessandro = commercial/scoping/delivery orchestration; Michele = architecture/AI/production). Use new bios. Premium, not generic.
- **ProcessSection ("Four phases. No retainer creep."):** fixed-scope delivery map — 4 columns (01 Diagnose, 02 Architect, 03 Build, 04 Harden), each compact structured rows: Duration / Inputs / Outputs / What you get / Risk reduced / Decision point. Subtle connectors. Make "No retainer creep" visually prominent. Structured rows, not paragraphs.
- **FitSection:** two side-by-side panels — Good fit (cool blue accent), Not a fit (muted gray/amber). Calm senior-consultant tone. Add the final line above.
- **FinalCTA:** premium closing panel — large "Bring us the system you need to ship.", short copy, primary "Book a 30-min scoping call", secondary "Send a brief by email", the refined `what_you_get.ts` artifact, "Reply within 1 business day" trust badge. Calm, no hype.

## Constraints / verification
tsc + build green. Each section conforms to the SHARED GRAMMAR (consistency is the deliverable).
Headless can't visually verify most of this — structural+copy correctness via build; visual 10/10
tuning is a follow-up eyeball pass on the deploy. Keep `card-steel`/tokens; don't invent new colors.
