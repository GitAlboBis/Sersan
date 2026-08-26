# SerSan — positioning charter

> **This file supersedes the 2026-06 homepage rebuild strategy of the same name.**
> That document positioned SerSan as *"an AI engineering studio for teams shipping
> AI into production"*, declared *"The buyers are technical"*, and set an ICP of
> *"CTO, VP Eng, Head of AI"*. It was accurate to the ambition and wrong about the
> market. It has been replaced rather than amended, because half of it was being
> quoted back into new work and quietly re-narrowing the site.
>
> Last revised: 2026-08-27 (repositioning pass).

---

## 1. The position

**SerSan is a founder-led custom software, AI and automation studio that solves
valuable business problems — from a focused workflow fix to a sophisticated
production platform.**

Not "an AI agency". Not "an MLOps consultancy". Not a design studio that also
codes. A studio that takes a business problem and returns working software,
choosing the technology afterwards rather than in the pitch.

**Core message**

> Start with the problem. Build the smallest useful solution. Scale what works.

**Secondary thesis**

> AI where it earns its place.

AI is a **capability, not a requirement**. Use conventional software when
conventional software is better. Use automation when automation is enough. Say
so out loud — the willingness to talk a client out of AI is the most credible
thing on the site, and it is already the thing prospects quote back.

**Tagline (unchanged, and untouchable)**

> The intelligence is artificial. The judgement stays human.

---

## 2. Who this is for

The previous charter's ICP was a technical buyer at a funded company. That buyer
is still welcome and still winnable — but they are not the market SerSan actually
sells into today, and writing exclusively for them cost every other conversation.

**Primary**

- SMEs and founder-led companies, with or without technical staff
- Growing businesses whose processes have outgrown spreadsheets and off-the-shelf tools
- Education and trading academies
- Real-estate businesses
- Management-software clients and partners
- Service businesses carrying a lot of manual work
- Companies that need internal software, a portal, or a customer-facing product
- Companies that want AI added to operations that already work

**Also, still**

- Early product teams
- Selected fintech, energy, agritech and industrial clients
- Regulated organisations that need the heavier posture

**Explicitly included: clients with no internal engineering team.** They do not
need a CTO to hire SerSan. SerSan can own technical delivery and hand back a
system the client understands and controls. Any sentence that assumes an in-house
engineer, an on-call rota, or "your team" as the operator is off-charter.

**The buyer needs to understand their business problem, not the solution
architecture.**

---

## 3. What a visitor must understand in ten seconds

1. What SerSan does.
2. Who it works with.
3. That it handles both small and complex projects.
4. That it builds actual software, not strategy decks.
5. That they do **not** need an internal CTO or engineering department.
6. That AI, automation and conventional software are all on the table.
7. That work is scoped clearly before development starts.
8. That they can start with one painful business problem.

If a page fails any of these, that is a defect, not a stylistic preference.

---

## 4. Commercial shape

A client must **never** feel they need a £15k–£50k engagement simply to talk to
SerSan. The published price floor that used to sit in the hero, the fit criteria
and the social share card is gone and does not come back.

SerSan takes focused work in roughly the **£2.5k–£10k** range when:

- the scope is clear,
- the business value is real,
- the project creates useful proof or strategic value,
- delivery can be tightly controlled.

**Small project ≠ cheap positioning.** SerSan is not a cheap dev shop and must
never read as one. The premium is the quality of judgement and execution — not an
artificial requirement that the client already has an engineering department and
an enterprise AI problem.

The message is: **start focused, prove the value, expand when it makes sense.**

### The engagement ladder

Defined once in `src/data/copy.ts` (`ENGAGEMENT`), never retyped:

| Rung | What it is |
|---|---|
| **Focused Diagnostic** | One workflow, product problem, automation opportunity or system. For smaller businesses and targeted decisions. |
| **Technical Audit** | The broader architecture, workflows, data, tooling and delivery environment. |
| **Delivery Sprint** | Design and build, shipped in visible increments against agreed acceptance criteria. |
| **Technical Partnership** | Continued development, support or fractional technical leadership. |

**Continuation is earned, not assumed.** SerSan *can* provide follow-on
development, maintenance, optimisation, fractional technical leadership and
retained support — each with its own scope, price and end. The old blanket
"no retainers" messaging contradicted the Fractional CTO offering sold on the
same page and is retired.

**Process proportional to risk. Small projects stay small.** A two-week
automation must not inherit the ceremony of a three-month platform build. Large
and high-risk systems get deeper architecture, testing, security and governance.

---

## 5. The settled facts

These contradicted each other across five surfaces each before 2026-08. They now
live in `src/data/copy.ts` (`FACTS`) and are imported, never retyped. **If you
find yourself typing one of these into a component, stop.**

| Fact | Value |
|---|---|
| Audit / diagnostic duration | **2–6 business days · fixed scope** |
| Audit deliverable | A written document, as long as it needs to be. **Never a slide deck.** Never sold by page count. |
| Build / sprint duration | **2–8 weeks, depending on scope** |
| Reply promise | **Within one business day** |
| Named projects | **Derived** from `caseStudies.length` — never a literal |
| Published price floor | **None** |

Previously live and now deleted: "one week", "two to three weeks", "1–2 weeks",
"1, 2, or 3 weeks", "six days", "20–30 pages", "12–20 pages", "executive deck",
"From £15K", the hardcoded "13 named engagements".

---

## 6. Proof and attribution

The archive holds 14 named projects. **Four are SerSan-contracted builds**
(SphereNode, Quantex.live, Terra Noa, Domus Tua). **Ten are Michele Sanna's prior
professional experience** — at Revolut, J.P. Morgan, Deloitte, Accenture,
Leonardo, the WHO, and as a pre-SerSan freelancer and founder. Salvatori is
counted as prior: its contract began before Sersan Limited existed.

Every entry in `src/data/case-studies.ts` carries:

```ts
attribution: "sersan" | "prior"
attributionPerson?: string   // "Michele Sanna"
attributionVia?: string      // "Deloitte", "Revolut", "freelance"
status: "live" | "production-beta" | "client-preview" | "private-launch"
      | "implementation" | "ongoing" | "planned" | "completed"
```

**Rules**

- Never present prior-employer work as a SerSan client engagement.
- Never build an aggregate that silently blends the two ("13 named engagements",
  "5 tier-1 institutions", "8 years senior delivery" as firm-level proof).
- Never use a client's own credentials as if they were a SerSan result.
- Never call something "production" whose status is preview, beta or planned.
- Prior experience is a **credibility asset when labelled honestly.** It is depth
  behind the offer, not the entry bar.

The two best proof points for the current market are **Domus Tua** (a real-estate
agency platform) and **SphereNode** (eight SaaS tools collapsed into one product).
Lead with those; let the tier-1 record sit behind them.

---

## 7. Voice

Intelligent, confident, commercially literate, technically credible, concise,
human, pragmatic, premium.

**Not**: arrogant, anti-client, anti-agency for its own sake, obsessed with
"3am", full of AI hype, "digital transformation", "cutting-edge solutions", or
generic consultancy language.

**Balance target across the site: 70% what the client gains · 20% how SerSan
works · 10% what SerSan refuses.** The old site ran closer to 20–25% refusal,
with an entire pinned homepage chapter devoted to disqualification. Refusal is
sharp when it is rare.

The site should say **"We are easy to start with and hard to disappoint"** — never
*"You must qualify to deserve access to us."*

**Technical terms**: ask whether the CEO of a 20-person company would understand
why it matters. If not, lead with the business consequence and put the mechanism
second.

> ❌ "Dead-letter queue with replay semantics."
> ✅ "Work never silently disappears. Anything that can't complete is captured,
>    surfaced and safely retried." — *then* the mechanism.

### Language worth keeping

- "AI where it earns its place."
- "Build, harden or stop."
- "Find what should not be built, before code becomes debt."
- "You own the code and the system."
- "Founder-led. Technically owned."
- "Production-grade when production-grade is actually required."
- "AI works best when it extends judgement, not when it replaces it."
- "We do not claim compliance certifications we don't hold. We do build systems that pass them."
- "About 70% of a production AI system is non-AI software that has to be right."
- "We migrate workflow-by-workflow, never big-bang."

---

## 8. Team

**Founder-led. Technically owned.**

Every engagement has a **named commercial owner** and a **named technical owner**,
and accountability stays senior. Team members and trusted specialists contribute
where appropriate — that is normal, and saying so is more credible than the old
claim.

Retired, because they were unsellable at the small-project tier and were
contradicted by the team's own third member: *"Both founders staffed on every
engagement"*, *"No layer of juniors"*, *"Senior or nothing"*, and any promise that
the founders personally operate every system forever.

- **Alessandro Serratt** — CEO & Commercial Lead. Discovery, requirements,
  commercial structure, client communication, product ownership, scope,
  acceptance, business outcomes. Not an engineer, and never described as one.
- **Michele Sanna** — CPTO / Technical Lead. PhD Applied Mathematics, LSE.
  Prior senior delivery at Revolut, J.P. Morgan, Deloitte, Brevan Howard,
  Accenture — always attributed as prior experience, never as SerSan client work.
- **Mattia Scattu** — Software Engineer. End-to-end delivery of internal systems.
  His resort-operator maintenance and inventory build is the clearest proof of
  the current positioning in the whole repository.

"We stay accountable through launch." Ongoing operating support is available
**when agreed** — not assumed, not forever, not free.

---

## 9. Compliance posture

SerSan holds **no certification**. Never render a bare status ("Compliant",
"Ready"), never imply a held attestation, and never guarantee regulatory
compliance.

Approved wording lives in `src/data/copy.ts` (`COMPLIANCE`):

> Systems can be designed to support applicable DORA, EU AI Act and security
> requirements. Regulatory obligations and certification remain scope-specific.

**Controls scale with the system.** A workflow automation and a regulated
production platform do not carry the same overhead. Claiming one universal
control regime across "every SerSan engagement" is both off-charter and
operationally false for a £5k build.

Internal claim tracking: `docs/CLAIMS_REGISTER.md` — internal only, never linked
from a page and never added to the sitemap.

---

## 10. Conversion

**Primary CTA, site-wide: "Send a project brief" → `/start`.**

"Book a call" is **forbidden** unless the visitor can genuinely schedule a time.
They cannot: `CAL_ENABLED` is `false` in `src/lib/site.ts` and the Cal.com slug is
a placeholder that 404s. Twenty-one booking-flavoured CTAs used to promise a
booking and deliver a written form. If real scheduling ships, this rule relaxes —
until then, do not write "book".

Contextual variants: *Show us the workflow · Tell us what you're building ·
Discuss the project · Start with the problem · Discuss a diagnostic.*
Secondary: *See our work · See how we work.*

Reassurance near a CTA — use **selectively**, never all three at once:
*"Two or three sentences is enough." · "Read by a founder." · "Reply within one
business day."*

The intake asks four required fields — **Name, Email, Company, and what you're
trying to build, automate or fix.** Everything else is optional. Budget bands
start at £2.5k–£5k and the form must accept every band the API accepts.

---

## 11. Where copy lives

The site is bilingual through **~437 inline `isEn ? "EN" : "IT"` ternaries across
40 components**. There is no live translation framework: `src/data/translations/`
holds five keys with real callers and nothing else (it was pruned from 331 keys
in this pass, because the orphans were shipped source asserting an unhedged
ISO 27001 claim and a bio for a person who is not on the team).

**Every copy change is two copy changes.** Change the English and its Italian
twin in the same edit, or the site ships half-repositioned. Italian addresses the
client as **"voi"** and runs 15–20% longer — check it against the same character
budget.

Facts, CTA labels, engagement terms and repeated positioning claims belong in
`src/data/copy.ts`. Prose unique to one surface stays inline.

---

## 12. Structural constraints on any copy work

This site's copy is load-bearing. Item counts are welded into GSAP runway
heights, snap stations and WebGL shader constants — changing one silently breaks
the scroll choreography of a whole page. **Rewrite in place; never add a row.**

| Locked | Where it binds |
|---|---|
| 6 fit pairs | `BEATS = 6` → runway height, beat clock, pane windows, `/ 06` readout, tick row |
| 4 service cards | `SEGMENTS = 4`, 4-entry `STAGE_POS`, the word "Four", the `01 / 04` stepper, 5 snap stations |
| 3 problem rows | `CLUSTER_COUNT = 3` in `neuralLatticeStore`, 3 `CALLOUT_POS` |
| 3 production rows | `IGNITE_NODES = 3`, `RING_T = [.25,.5,.75]` |
| 3 team cards | `MORPH_MAX = min(founders.length, 3) − 1` |
| 3 engagement acts | "Three formats." + `i === 1` column offset |
| 8 practice rows | "Eight surfaces." + cached per-row document centres |
| 4 process phases | `lg:grid-cols-4` on one drawn spine |
| 4 intake steps | `TOTAL_STEPS = 4`, panes rendered per hard-coded index |
| 6 pipeline stages | `STAGE_KEYS.length` → position arrays, fractions, idle light loop |
| 11 home line anchors | 1:1 with waypoints in `webgl/curves/routeCurves.ts` |

Also: several headings are SplitText-driven and authored as *plain text node +
exactly one `<span className="italic">`*. Keep that shape — same spans, same
nesting. And `FitSection` renders its headline **twice** (native and pinned);
change one and the other still says the old thing.

---

## 13. Out of scope / open

- **Consent.** `@vercel/analytics` mounts unconditionally while `/cookies`
  declares consent-gated analytics. Either a consent mechanism ships or the
  analytics go. Do not add conversion instrumentation on top of the gap.
- **Real scheduling.** Until Cal.com is live, no page may say "book".
- **`/resources`** is a three-article stub behind a full editorial surface.
- **Newsletter** is specified and absent.
- **`info@sersan.io`** must exist as a mailbox — visitor-facing mail was
  previously routed to a personal address on a non-canonical domain.
