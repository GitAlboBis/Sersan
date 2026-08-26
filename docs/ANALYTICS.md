# Conversion instrumentation

What we measure on sersan.io, why, and the rules that keep it lawful and useful.

Implementation: [`src/lib/analytics.ts`](../src/lib/analytics.ts).
Transport: Vercel Web Analytics (`@vercel/analytics`), mounted in `src/app/layout.tsx`.

---

## Why there is no cookie banner

**Vercel Web Analytics is cookieless.** It sets no cookie, persists no
identifier in the browser, and does not follow visitors across sites. Nothing
here needs consent under the ePrivacy cookie rule, because nothing is stored on
or read from the visitor's device.

This matters because the site previously had a real gap: `/cookies` declared a
consent-gated analytics category while the analytics script mounted
unconditionally and no consent mechanism existed anywhere in the codebase. The
gap was closed by making the policy describe what actually happens, not by
bolting on a banner for a technology that does not need one.

**If that ever changes** — if someone adds Google Analytics, a Meta pixel, a
session recorder, or any script that writes an identifier — the banner becomes
mandatory and this document is wrong until it is rewritten.

---

## What we never send

The single rule that matters:

> **Never send free text the visitor typed.**

Not the project brief. Not the company name, the role, the email, the phone
number, the current stack, the constraints, or a link they pasted. Only
**enumerated values the code itself chose**.

The distinction in practice:

| ✅ Sent | ❌ Never sent |
|---|---|
| `budget_band: "5-10k"` | the budget they typed in a free-text field |
| `service: "automation"` | the description of what they want built |
| `fields: "email,company"` (which fields failed) | what was *in* those fields |
| `form: "start"` | anything identifying who filled it in |

Everything sent is a value from a fixed set, so no event can single a person
out. `EventProps` in `analytics.ts` is deliberately a closed interface for this
reason — adding a property is a decision, not an accident.

UTM parameters (`utm_source`, `utm_medium`, `utm_campaign`) are read from the URL
at fire time, capped at 64 characters, and never persisted or joined to anything
else.

---

## The events

### Conversion intent

| Event | Trigger | Properties | What it tells us |
|---|---|---|---|
| `cta_project_brief` | Any primary "Send a project brief" CTA is clicked | `page`, `source_section`, `lang` | The core conversion signal. `source_section` is the important one — every brief CTA points at `/start`, so without it we cannot tell whether the hero, the final CTA or the nav pill is doing the work. |
| `cta_selected_work` | Secondary "See our work" CTA | `page`, `source_section` | Whether proof is what people want next, versus starting a conversation. |
| `service_cta_clicked` | A service page's own CTA | `page`, `service`, `source_section` | Which of the four services actually converts. Previously unknowable. |
| `case_study_cta_clicked` | A case study's CTA | `page`, `case_study` | Whether a specific project drives enquiries — and specifically whether the SME-legible builds (Domus Tua, SphereNode) convert differently from the tier-1 prior-experience entries. |
| `cta_audit` | The `/audit` conversion CTA | `page`, `source_section` | Demand for the paid diagnostic as an entry product. |
| `cta_email` | A `mailto:` link | `page`, `source_section` | How many people bypass the form entirely. If this is large, the form is too heavy. |
| `cta_phone` | A `tel:` or WhatsApp link | `page`, `source_section` | Same, for people who want to talk. |

### The intake funnel

Fired in order; the drop between consecutive steps is the diagnosis.

| Event | Trigger | Properties | What it tells us |
|---|---|---|---|
| `lead_form_viewed` | The form scrolls into view. Once per page view. | `page`, `form` | Denominator for the whole funnel. |
| `lead_form_started` | First interaction with any field. Once per page view. | `page`, `form` | View → start is the intimidation metric. A wide gap here means the form still looks like work. |
| `lead_form_budget_selected` | A budget band is chosen | `form`, `budget_band` | **The commercial question this repositioning exists to answer**: are the sub-£10k bands actually being selected? Before this pass the `/consulting` form's lowest band was £15–50k, so the answer was structurally unknowable. |
| `lead_form_error` | Client-side validation blocks a submit | `form`, `fields` | Which fields people get stuck on. `fields` carries field *names* only. |
| `lead_form_submitted` | The server accepts the submission | `page`, `form`, `lang` | The conversion. |

### Engagement depth

| Event | Trigger | Properties | What it tells us |
|---|---|---|---|
| `scroll_depth` | Homepage passes 25 / 50 / 75 / 100% | `page`, `depth` | Where the long scroll loses people. Each milestone fires at most once, and the listener detaches at 100%. |
| `service_completed` | A service page is read to the end | `page`, `service` | Whether the two-level (non-technical first, technical underneath) structure holds attention. |
| `case_study_completed` | A case study is read to the end | `page`, `case_study` | Whether the media rail earns its length. |

---

## Firing discipline

Events must fire **once per user intent**.

- `track()` — for discrete actions (a click). Fire on the event handler.
- `trackOnce()` — for view/started/depth events that live in effects, scroll
  handlers or focus handlers. Guards against re-renders, React StrictMode's
  double-invoke in development, and repeated scroll ticks.
- `resetTrackOnce()` — call on client-side route change so a second page view in
  the same session can fire its view events again.

`trackScrollDepth(page)` attaches a passive, rAF-throttled scroll listener and
returns its own cleanup. It detaches itself at 100%, which matters on the
homepage: that page already runs a WebGL render loop and several pinned
ScrollTriggers, and an extra un-throttled handler on the scroll path is a real
frame-budget cost.

Both `track()` and `trackOnce()` are no-ops during SSR and swallow their own
errors. **Instrumentation must never take a conversion down with it** — a
failed analytics call on a CTA click must still navigate.

---

## Reading the numbers

Three questions this instrumentation was built to answer, all of which the
previous setup could not:

1. **Does the repositioning open the funnel?**
   Watch `lead_form_budget_selected` by band. If the £2.5k–£10k bands stay empty,
   the site still reads as expensive regardless of what the copy says.

2. **Which door do people come through?**
   `cta_project_brief` split by `source_section`, against `cta_audit`. The
   hypothesis behind the repositioning is that a written brief converts better
   than a paid diagnostic as a first step. This measures it.

3. **Is the form still too heavy?**
   `lead_form_viewed` → `lead_form_started` → `lead_form_submitted`, plus the
   ratio of `cta_email` to `lead_form_submitted`. People emailing instead of
   filling the form is the form telling you something.

Custom events require a Vercel plan that includes them. If they are not
appearing in the dashboard, check the plan before debugging the code — the calls
fail silently by design.
