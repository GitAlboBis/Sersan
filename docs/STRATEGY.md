# SerSan v2 — homepage rebuild strategy

> Consolidated output of the 17-prompt rebuild brief (SEO prompt 14 skipped).
> This is the source of truth for the implementation pass that follows.

---

## Part A — Strategy (prompts 1, 4)

### A1. Sharpened positioning

**One-liner**
SerSan is an AI engineering studio for teams shipping AI into production — not pilots, not demos, not Notion plans.

**The wedge**
> *Production AI is a system, not a model.*
> Evaluation, monitoring, guardrails, human review, data boundaries, cost
> control, rollback paths, deployment hygiene, and maintainability — wired in
> from day one, not bolted on at launch.

**Why this wins**
- Most "AI agencies" sell chatbots and dashboards. SerSan sells reliability.
- The buyers are technical. They are tired of demos that survive a board
  meeting and die in week three. They want the studio that thinks about the
  3am pager, not the launch tweet.
- The cinematic spine on the site already says "we think in systems." The
  copy and IA below make the commercial promise match that visual claim.

### A2. Ideal customer profile

**Buyer**: CTO, VP Eng, Head of AI, technical founder. Sometimes Head of
Product if they're technical and have engineering authority.

**Company shape**:
- SaaS, fintech, healthtech, agritech, energy, regulated B2B
- Seed → late-stage; pre-seed only if technically led
- Has an actual workflow with measurable cost or revenue tied to it
- Has someone who can own the system internally after handover

**Triggers that bring them**:
- A prototype that works in demo and breaks under real volume
- A team that built an agent and can't tell why it's failing
- An audit deadline (EU AI Act, DORA, SOC2-adjacent)
- A pilot that ate three quarters and shipped nothing
- A founder who wants senior engineering without a 9-month hire

**Disqualifiers**: marketing AI gimmicks, no workflow owner, no budget for
implementation, "we just want to add ChatGPT to our app."

### A3. Section order (final)

```
01  CinematicSystemScroll       — hero + pinned spine (existing)
02  CredibilityStrip            — wordmark marquee (existing)
03  ProblemSection              — NEW
04  ServicesSection             — REBUILT
05  UseCasesSection             — NEW
06  ProductionGradeSection      — REBUILT (live artifacts, done)
07  CaseStudiesSection          — existing, real engagements
08  ProcessSection              — REBUILT (Diagnose / Architect / Build / Harden)
09  FitSection                  — REBUILT (for / not-for)
10  FinalCTA                    — REBUILT (links to /start)
```

### A4. Goals per section

| # | Section | Goal |
|---|---------|------|
| 01 | Cinematic spine | Establish premium engineering aesthetic + state the wedge. |
| 02 | Credibility | Earn permission to keep reading via real wordmarks. |
| 03 | Problem | Name the pain. "Demo → production" gap. |
| 04 | Services | What we build. Concrete, purchasable. |
| 05 | Use cases | Where this lands in a real team. Helps buyers self-locate. |
| 06 | Production-grade | What "production-grade" *operationally* means. (Already animated.) |
| 07 | Work | Real engagements. Removes generic-agency suspicion. |
| 08 | Process | How an engagement actually runs. Reduces purchase friction. |
| 09 | Fit | Who this is for. Honest disqualification. |
| 10 | Final CTA | Convert into /start. |

### A5. Navigation (final decision)

**Final nav**: `Services / Use Cases / Work / Process / Start →`

`Start` is rendered as the primary CTA pill, not a plain nav item. This is
buyer-intent navigation (the labels match what a CTO would type), it
collapses "Consulting" + "Production-grade" into the sections they actually
describe, and it gives every nav click a clear next action.

**Five-option matrix (prompt 4)**

| Option | Labels | Best for | Weakness |
|---|---|---|---|
| **Buyer-intent (chosen)** | Services / Use Cases / Work / Process / Start | Mid-funnel CTOs who already know what category of help they want | Doesn't hint at "audit" — handled via in-page CTA |
| Service-led | Agents / Automation / MLOps / Audit / Start | Buyers shopping a specific service | Misses people who lead with use case |
| Outcome-led | Ship / Audit / Operate / Work / Start | Pithy, brand-forward | A bit too clever; less scannable |
| Library-led | Services / Work / Resources / About / Start | Content-heavy strategy | SerSan isn't a content site yet |
| Conservative | Consulting / Work / About / Contact | Lowest risk | Generic; current site's problem |

**Mobile nav**: same five items, full-screen sheet, single-column,
Start as the bottom-anchored CTA.

### A6. Service pages (Phase 2, not this implementation pass)

- `/services/agents` — AI agents and orchestration
- `/services/automation` — workflow automation
- `/services/mlops` — MLOps + evaluation
- `/services/architecture` — AI architecture + technical audits
- `/audit` — packaged "AI Systems Production Audit" offer

### A7. Trust signals required on the homepage

1. Real client wordmarks (J.P. Morgan, Revolut, Apple UK via Deloitte, etc.)
2. Real engagement names + outcomes in the Work section
3. The Production-Grade artifacts (eval / trace / permissions) — visual proof
4. Two-founder note (low ego, "you talk to one of us")
5. Plain statement of compliance posture (don't overclaim certifications)

---

## Part B — Copy (prompts 2, 3, 5, 6, 7, 9, 10)

### B1. Hero (prompt 2 — final + alternates)

**Final hero (this is what ships)**

- **Eyebrow** — AI engineering studio · production systems
- **Headline** — *Ship AI systems that work beyond the demo.*
- **Subhead** — SerSan designs, builds, and hardens AI agents, workflow
  automation, MLOps pipelines, and AI architecture for technical teams that
  need reliable systems — not fragile prototypes.
- **Primary CTA** — Book a technical scoping call → `/start`
- **Secondary CTA** — See selected work → `#work`

**Headline alternates** (kept for A/B later)
1. Ship AI systems that work beyond the demo.
2. Production AI, not prototypes.
3. The AI engineering studio your CTO would hire.
4. Build AI systems that survive production.
5. Engineering for AI that has to be on call.
6. AI you can put in front of a regulator.
7. From demo to dependable.
8. We build the AI that has to keep working.
9. Reliability is the feature.
10. Production-grade AI, from first call to handover.

**Subhead alternates**
1. AI agents, automation, MLOps, architecture, and audits — engineered for
   teams that can't afford a system that only works on stage.
2. We design, build, and harden the AI systems your team will actually
   maintain on call.
3. Two senior engineers. One studio. The AI work you'd otherwise hire a
   senior team to do.
4. From audit to production handover — without the prototype graveyard.
5. We treat AI as a system: evals, traces, guardrails, rollback, handover.
6. The studio for teams who need AI that holds up at 3am.
7. Agents, automation, MLOps, audits — built with the discipline of
   infrastructure, not the speed of demos.
8. Senior AI engineering for the systems you can't afford to half-ship.
9. Production AI for CTOs who want fewer surprises, not more dashboards.
10. We build the AI systems your team will trust their roadmap to.

**Eyebrow alternates**
1. AI engineering studio · production systems
2. SerSan · for teams shipping AI into production
3. The studio for production AI
4. AI engineering · audit, build, harden
5. Production AI for technical teams
6. AI systems engineering · London / EU
7. Two senior engineers · one studio
8. Production-grade AI, by design
9. AI engineering, not AI marketing
10. We build the AI that has to keep working

**Primary CTA alternates**
1. Book a technical scoping call *(final)*
2. Start with a scoping call
3. Book a 30-min technical call
4. Talk to engineering
5. Send a project brief
6. Get an AI systems audit
7. Book a production review
8. Scope a project
9. Start a conversation
10. Book a call with the founders

**Secondary CTA alternates**
1. See selected work *(final)*
2. See what we build
3. Read recent engagements
4. See how we work
5. Read the field notes
6. See process
7. See the audit offer
8. See our case studies
9. Browse capabilities
10. Read about the studio

**6 proof-bullet sets for under the hero**

Set 1 (chosen for current spine — minimal, the cinematic stage carries the
weight)

- Real production systems, not pilots that died in week three.
- Two senior engineers — you talk to one of us, not a sales lead.
- Reply within one business day.

Set 2 (numeric flavour)
- ~13 named engagements across FinTech, Healthtech, Aerospace, Industrial.
- 100% senior delivery. No juniors fronted by partners.
- One-call scoping → fixed-scope week, not 9-month retainer creep.

Set 3 (process-led)
- Audit → Architect → Build → Harden, with a handover that holds.
- Evaluation suite shipped before the system is "done".
- Code, traces, evals, and runbooks — yours, in your repo.

Set 4 (compliance-led)
- EU AI Act / DORA / SOC2-adjacent posture on day one.
- Data residency and permissions modeled before features.
- We tell you what we won't build, in writing, in scoping.

Set 5 (skeptic's bullets)
- We will tell you when AI is the wrong solution.
- About a third of scoping calls end with "don't build this."
- No "AI strategy decks" — we ship systems or we don't engage.

Set 6 (anti-agency)
- No account managers. No upsells. No multi-year retainers.
- Senior engineers in the room from call one through handover.
- The system that ships and the system in production are the same system.

### B2. Full homepage copy (prompt 3)

#### 03 — Problem section (NEW)

**Eyebrow** — The demo–production gap

**Headline** — *Most AI projects don't fail at the prototype. They fail two months after.*

**Body** — The demo worked. The board nodded. Then production volume hit
and the agent started lying, the retrieval drifted, the cost-per-run
tripled, and no-one on the team could tell which of the seven things you
changed last week broke it.

**Three failure modes (cards)**

| Card | Headline | Body |
|---|---|---|
| 01 | *No evals → no signal* | A system you can't measure is a system you can't fix. Most teams ship without a regression set, then debug at 3am with prompt diffs. |
| 02 | *No traces → no debugging* | When the agent makes the wrong call, you need to know which step failed. Without structured tracing, every incident is archaeology. |
| 03 | *No boundaries → no trust* | Tools and data without permission models become a liability the first time the agent does something a regulator notices. |

#### 04 — Services (NEW — replaces existing ServicesSection)

**Eyebrow** — What SerSan builds

**Headline** — *Four services. One discipline.*

**Body** — Every engagement is delivered by senior engineers from scoping
to handover. No account layer, no junior bench, no roadmap that quietly
becomes a retainer.

**Service cards**

**01 — AI Agents** *(prompt 6)*
*Agents that survive their second week.*
Typical build includes:
- Tool / API integration with permission scoping
- Retrieval (RAG) with grounding evals and citation checks
- Multi-step planning with replay + rollback
- Eval harness with day-zero baseline + drift alerts
- Structured tracing from input to action
Solves: prototypes that hallucinate under real traffic, agents you can't
debug, tool calls without guardrails.
CTA: See agent engagements →

**02 — Workflow Automation**
*Automation that compounds, not breaks.*
Typical build includes:
- LLM-augmented workflows wired into existing systems
- Human-in-the-loop approval steps where they matter
- Retry, rollback, and dead-letter paths
- Cost-per-run instrumentation
- Owner handover with runbook
Solves: Zapier-stack fragility, "we automated it but no-one trusts it,"
unbounded LLM spend.
CTA: See automation engagements →

**03 — MLOps & Evaluation**
*Models in production, not in notebooks.*
Typical build includes:
- Evaluation suite (regression + drift + safety)
- Deployment pipeline + model registry
- Monitoring, latency / cost / accuracy dashboards
- Shadow / canary / rollback paths
- Retraining triggers and ownership
Solves: models that ship once and rot, no signal when accuracy drops,
teams that can't roll back safely.
CTA: See MLOps engagements →

**04 — AI Architecture & Audits**
*Find what should not be built — before code becomes debt.*
Typical build includes:
- Systems audit: architecture, data, risk, cost, compliance
- Build vs. buy vs. don't-build recommendations
- Reference architecture + sequencing plan
- Risk register (technical + regulatory)
- Optional follow-on build engagement
Solves: pilots that ate two quarters, AI roadmaps with no critical path,
compliance ambiguity, vendor lock-in.
CTA: See the audit offer →

#### 05 — Use cases (NEW)

**Eyebrow** — Where this lands in a real team

**Headline** — *Six places SerSan typically gets called in.*

Six tile cards, each 1–2 lines:

1. **Production agent rescue** — Your agent works in demo, fails in prod, and the team can't reproduce the failures.
2. **Workflow automation that scales** — You have a fragile Zapier / n8n / Make stack and need a real engineering layer underneath it.
3. **MLOps from scratch** — You have models in notebooks and no deployment pipeline. You need eval, registry, monitoring, rollback.
4. **AI architecture for a new product** — You're scoping a new AI feature and need someone senior to design it before you commit eng cycles.
5. **AI Systems Production Audit** — You have AI in production (or close) and you need an honest readiness review before a board / customer / regulator.
6. **Fractional senior AI engineering** — You don't yet need a full team. You need senior judgment in your stand-ups for one or two quarters.

#### 06 — Production-grade (already animated, copy locked)

**Eyebrow** — What production-grade actually means

**Headline** — *Production-grade is not a vibe. It is a system.*

**Body** — Not a list of compliance buzzwords. These are artifacts you can
ask to see in any scoping call.

**The 12-item checklist (prompt 7)** — rendered as a tight grid below the
three animated artifacts:

| # | Item | One-liner |
|---|---|---|
| 01 | Evaluation harness | Versioned cases, day-zero baseline, weekly drift checks. |
| 02 | Structured tracing | Every step logged: retrieval, planning, tool calls, review. |
| 03 | Human-in-the-loop | Approval steps where the cost of being wrong is high. |
| 04 | Guardrails & permissions | What the agent *can* do, scoped before it can. |
| 05 | Data boundaries | Residency, retention, access — modeled before code. |
| 06 | Cost control | Per-run budgets, cost dashboards, runaway-loop protection. |
| 07 | Error handling | Retries, dead-letters, failure isolation. Not "wrap in try/except". |
| 08 | Rollback paths | Every deploy reversible. Every model swap shadowed first. |
| 09 | Observability | Latency, accuracy, error rate, drift — not just CPU. |
| 10 | Documentation | Runbooks, architecture, decisions, post-mortems — yours, in your repo. |
| 11 | Compliance-aware architecture | EU AI Act / DORA / sector-specific posture from day one. |
| 12 | Maintainability | A team who didn't build it can run it on day 91. |

**Closing line under the checklist (already present)**
> We do not claim compliance certifications we don't hold. We do build
> systems that pass them.

**CTA** — See an example audit deliverable → `/audit` *(stub OK for now)*

#### 07 — Work / Case studies (existing, copy refreshed)

**Eyebrow** — Selected work

**Headline** — *Engineering you can name.*

**Body** — Thirteen engagements across FinTech, Healthcare, Aerospace,
Public Sector, Industrial, Energy, and Agritech. No anonymised stand-ins.

(Keep the existing `<CaseStudiesSection>` — the case study cards already
exist and are real. Just retitle the section.)

#### 08 — Process (REBUILT — 4 phases)

**Eyebrow** — How an engagement runs

**Headline** — *Four phases. No retainer creep.*

**Phases (prompt 9)**

**01 — Diagnose** *(typically 1 call + 1 week)*
- Inputs: your stack, workflow, constraints, data, ambitions.
- Outputs: signal map, risk register, build-vs-don't-build call.
- You get: a written recommendation. Sometimes that's "don't build this."
- Risk reduced: spending a quarter on the wrong system.

**02 — Architect** *(1–2 weeks)*
- Inputs: agreed scope, technical interviews, data sample.
- Outputs: reference architecture, eval plan, cost model, sequencing.
- You get: the system on paper before it's in production.
- Risk reduced: rebuilds at week 8 because the architecture didn't survive.

**03 — Build** *(2–8 weeks, fixed scope)*
- Inputs: signed architecture, access, owner on your side.
- Outputs: the system + eval harness + traces + runbook + handover.
- You get: production code, in your repo, with owner training.
- Risk reduced: an agency-shaped black box you can't operate.

**04 — Harden** *(post-launch, scoped)*
- Inputs: live telemetry, first month of incidents.
- Outputs: drift checks, rollback drills, observability tuning.
- You get: a system your on-call team trusts.
- Risk reduced: a launch that gets quietly turned off in month two.

#### 09 — Fit / Not for (REBUILT — prompt 10)

**Eyebrow** — Selective on purpose

**Headline** — *We are honest about who we work with.*

**Two columns, equal weight:**

| ✓ Good fit | ✗ Not a fit |
|---|---|
| You have a real workflow with cost or revenue tied to it | You want a chatbot gimmick for a press release |
| You have an internal owner who'll run the system after handover | No owner, no roadmap, no operational plan |
| You're moving from prototype → production, or hardening live AI | You're at the slide-deck stage with no engineering budget |
| You're regulated (or about to be) and want to be ready | You want to skip compliance to ship faster |
| You're technical, or have technical authority | You need a partner to convince your CTO this is a good idea |
| You can budget for senior engineering, not just license costs | "Can you do it for equity" |

**CTA under the table** — If you're not sure which column you're in, book a
scoping call. We'll tell you. → `/start`

#### 10 — Final CTA (REBUILT)

**Headline** — *Two founders. One studio. Reply within one business day.*

**Body** — Tell us what you're trying to build, automate, or harden. We'll
review the context and recommend the right next step — sometimes that's a
build, sometimes that's an audit, sometimes that's "don't do this."

**Primary CTA** — Book a technical scoping call → `/start`
**Secondary CTA** — Or send a brief by email → `mailto:hello@sersan.io` *(secondary only)*

### B3. /start page (prompt 5 → prompt 19)

**Headline** — *Start with a technical scoping call.*

**Subhead** — Tell us what you're trying to build, automate, or harden.
We'll review the context and reply within one business day with a
recommended next step.

**Trust line above the form** — No marketing follow-ups. No demo decks.
Read by one of the founders, not a queue.

**Form fields** (the contract; intake API to match)

| Field | Type | Required | Placeholder / options |
|---|---|---|---|
| Name | text | yes | Your full name |
| Work email | email | yes | you@company.com |
| Company | text | yes | Company name |
| Role | text | yes | CTO / Head of AI / Founder / Other |
| What are you trying to build, automate, or fix? | textarea | yes | Two or three sentences is plenty — we'll dig in on the call. |
| Current stage | select | yes | Idea / Prototype / Internal pilot / Production system / Broken existing system |
| Timeline | select | yes | ASAP / This month / This quarter / Exploring |
| Budget range | select | yes | Under £15k / £15–50k / £50–150k / £150k+ / Not sure |
| Existing stack | text | no | e.g. Python, Postgres, OpenAI, LangChain, Vercel |
| Compliance / security constraints | text | no | e.g. EU data residency, SOC2 in flight, HIPAA-adjacent |
| Links or extra context | textarea | no | Loom, repo, doc, deck — anything that helps us read in. |

**CTA button** — Send project brief

**Confirmation message** — Thanks — we'll review your brief and reply
with a recommended next step within one business day. If it's urgent,
reply to the confirmation email and we'll prioritise.

**Alternative for the not-ready** — *Not ready to scope a project? Read
how we work →* `/process`

### B4. AI Systems Production Audit — packaged offer (prompt 16)

**Positioning** — A fixed-scope, fixed-fee review for teams with AI in
production (or about to be) who want an honest readiness call before a
board meeting, customer commitment, audit, or regulator.

**Who it's for** — CTOs with AI live or near-live; technical founders
post-prototype; heads of AI inheriting a system they didn't build.

**What we review** — Architecture, eval coverage, monitoring, guardrails,
data boundaries, cost model, deployment hygiene, rollback paths,
documentation, compliance posture.

**Deliverables**
- Written readiness report (12–20 pages, your repo and your inbox)
- Risk register with severities + sequencing
- "What we'd build, what we wouldn't, what we'd kill" recommendation
- 60-min walkthrough call

**Timeline** — 1, 2, or 3 weeks depending on system surface.

**Pricing framing** — Fixed fee starting at the cost of a senior engineer
for one week. Credited against any follow-on build engagement.

**CTA** — Book a 20-min audit fit call →

This page is `/audit` and is a future implementation pass. The homepage
links to it via the Services section card 04.

---

## Part C — Visual + wireframe (prompts 11, 17)

### C1. Visual principles

1. **Engineering aesthetic, not space marketing.** The cinematic spine
   says "we think in systems." Every other section says "we ship them."
   Don't repeat the cinematic register elsewhere — let it carry the page
   open, then go calm.
2. **One accent, used as voltage.** Electric blue (`hsl(205 95% 62%)`)
   is reserved for: primary CTAs, active rail markers, italicised emphasis
   in headlines, and the live-pulse colour in the production-grade
   artifacts. Never decorative.
3. **Type does the heavy lifting.** Editorial New (display) for headlines,
   Switzer (body), JetBrains Mono (eyebrows, code, micro-labels).
   Italic display = the wedge claim, used sparingly.
4. **Rhythm beats density.** Big section gaps. Single column on text
   blocks. Two- or three-column grids for proof. Never a four-column wall.
5. **The grid is atmosphere.** Body grid is barely visible (already
   tuned). Cards do not also have visible grids inside them.

### C2. Colour rules

- **Background** — `--bg` (deep navy). Don't pure-black.
- **Surface** — `--surface` for elevated cards. `--surface-elev` for
  card-on-card (rare).
- **Ink hierarchy** — `--ink` (white), `--ink-mute` (60% white), `--ink-dim`
  (30% white). Use the dim shade for legal / micro / dividers only.
- **Accent** — blue only on primary CTA, live pulses, and the italic
  emphasis in headlines.
- **Status hues** — green / amber / red exist only inside the
  Production-grade artifacts and Use Cases tiles. They never leak into
  general UI.

### C3. Typography rules

- **Display** — Editorial New, `clamp(2.25rem, 4.5vw, 4rem)` for section
  H2, `clamp(3rem, 7.5vw, 7rem)` for the hero. Letter-spacing `-0.028em`.
  Italic reserved for emphasis.
- **Body** — Switzer 400/500. Line-height 1.55 for paragraphs.
- **Mono** — JetBrains Mono, `0.625rem`, uppercase, tracking `0.14em` for
  eyebrows and micro-labels.
- **Numerics** — `tabular-nums` everywhere a number changes in animation.

### C4. Layout rhythm

- Sections: `section-lg` (~7rem top/bottom on desktop, ~4rem mobile).
- Container: `container-px` (responsive margin/gutter).
- Section divider: thin centred rule with accent dot (already
  implemented as `<SectionDivider>`).

### C5. Card design

- Border: `hsl(var(--rule))`, 1px, 8px radius.
- Background: `hsl(var(--bg))` (so the body atmosphere reads behind).
- Internal padding: `p-6` minimum.
- Hover: subtle border lift to `hsl(var(--ink) / 0.2)`, no scale.
- No card shadow. The dark theme handles depth via contrast, not blur.

### C6. Animation rules

- Reveal on scroll: 12–16px Y offset + opacity, ease-out cubic, 350–500ms.
- Cinematic spine: scrub-linked, no autoplay.
- Card visuals: looped only while in view (IntersectionObserver gate —
  already implemented in production-grade).
- Hover: ≤200ms. Page transitions: ≤400ms.
- `prefers-reduced-motion`: kill cinematic scrub, kill marquee, kill
  card loops. Keep static end-states.

### C7. Mobile

- Cinematic spine collapses to stacked stages (already implemented).
- All grids collapse to 1 column < 768px.
- Hero subhead shortens to 1.5 lines.
- Sticky CTA bar at the bottom on the homepage only (optional, Phase 2).

### C8. Wireframe (prompt 17 — homepage)

```
┌─────────────────────────────────────────────────────────────┐
│  NAV   Logo · Services · Use Cases · Work · Process · [Start]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   CINEMATIC SPINE (600vh pinned)                            │
│   • Stage 0 — eyebrow + hero headline + primary/secondary   │
│   • Stage 1 — Signals                                       │
│   • Stage 2 — Audit                                         │
│   • Stage 3 — Build                                         │
│   • Stage 4 — Operate                                       │
│   • Stage 5 — Online + scoping CTA                          │
│   • 10-frame planet cross-fade overlay                      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  CREDIBILITY STRIP — wordmark marquee                       │
├─────────────────────────────────────────────────────────────┤
│  PROBLEM (NEW)                                              │
│  Eyebrow / H2 / body                                        │
│  3-card grid: failure modes                                 │
├─────────────────────────────────────────────────────────────┤
│  SERVICES (REBUILT)                                         │
│  Eyebrow / H2 / body                                        │
│  2x2 grid of service cards (Agents / Automation / MLOps /   │
│  Architecture & Audits)                                     │
│  Each card: 01 number · title · positioning · 5 bullets ·   │
│  pain solved · CTA                                          │
├─────────────────────────────────────────────────────────────┤
│  USE CASES (NEW)                                            │
│  Eyebrow / H2                                               │
│  3x2 grid of use-case tiles                                 │
├─────────────────────────────────────────────────────────────┤
│  PRODUCTION-GRADE (DONE)                                    │
│  3 animated artifacts + 12-item checklist + closing line    │
├─────────────────────────────────────────────────────────────┤
│  WORK — existing CaseStudiesSection (copy retitled)         │
├─────────────────────────────────────────────────────────────┤
│  PROCESS (REBUILT)                                          │
│  Eyebrow / H2 / body                                        │
│  4 phase cards: Diagnose · Architect · Build · Harden       │
│  Each card: title · duration · inputs · outputs · risk      │
├─────────────────────────────────────────────────────────────┤
│  FIT (REBUILT)                                              │
│  Eyebrow / H2                                               │
│  2-column table: good fit / not a fit                       │
│  CTA below                                                  │
├─────────────────────────────────────────────────────────────┤
│  FINAL CTA (REBUILT)                                        │
│  H2 / body / primary (→/start) / secondary (mailto)         │
├─────────────────────────────────────────────────────────────┤
│  FOOTER (existing)                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation scope, in order

1. Nav rewrite — `Services / Use Cases / Work / Process / Start`. Replace
   mailto with `/start` everywhere on the homepage path.
2. Hero copy on the cinematic spine — tighten stage 0 to the new headline /
   subhead / CTAs; leave the stage architecture intact.
3. New sections: `ProblemSection`, `ServicesSection` (rebuild), `UseCasesSection`,
   `ProcessSection` (rebuild), `FitSection` (rebuild), `FinalCTA` (rebuild).
4. `/start` page + intake form rewrite + `/api/intake` schema migration.
5. Page reorder in `src/app/page.tsx`.
6. Self-audit (prompt 20).

Out of scope this pass:
- Service detail pages (`/services/*`)
- `/audit` packaged-offer page
- SEO pass (prompt 14)
- A11y / perf audit deliverables (prompts 12, 13)
