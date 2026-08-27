# Claims register — /trust and legal surfaces

**Internal only.** Not linked from any page, not in `src/app/sitemap.ts`, not in
`public/robots.txt`. If this file ever needs to be public, it needs a lawyer first.

Created 2026-08-27 during the repositioning pass. It exists because /trust is the
most legally exposed surface on the site: it was written for a regulated-fintech
procurement reader and, in the process, made several statements that read as held
attestations or as measured guarantees nobody had instrumented.

**Rule of the register:** a claim ships only when the *evidence* column names
something a person could actually produce on request. "We believe so" is not
evidence. Where there is no evidence, the claim is reworded to posture
("designed to support …", "where the client's obligations require it") or removed.

**Status key**
- `SHIPPED` — the safe wording in the last column is live on the page.
- `REMOVED` — the claim is gone from the site.
- `OPEN` — the page is now safe, but an owner decision or an artefact is still needed.
- `BLOCKED` — the file that carries it is owned by another surface; reported, not fixed.

---

## 1. Certifications and regulatory status

| claim | page | evidence | owner | status | safe public wording |
|---|---|---|---|---|---|
| "ISO 27001 — In progress. Information security management system in active certification." | /trust (standards ledger) | None. No ISMS documentation, no statement of applicability, no certification body engaged, nothing in the repo or in `docs/`. | Alessandro | SHIPPED | "We hold no ISO 27001 certification and don't claim one. We use the 2022 standard as a control reference where a client's procurement needs that vocabulary." |
| "ISO 27001 (IN PROGRESS)" in the site-wide footer badge, on **every route** | `src/components/footer.tsx` (not owned by this pass) | Same — none. | Alessandro | BLOCKED | Remove the ISO segment from the badge, or reduce the badge to "GDPR · DORA · EU AI Act — posture, not certification". Reported to the footer owner. |
| "ISO 27001 certification is in progress" ×2 in the /trust FAQ answers | /trust (privacy FAQ) | None. | Alessandro | REMOVED | Answers rewritten; no ISO reference remains in the FAQ. |
| "ISO 27001, DORA, EU AI Act Posture" + "operates with an ISO 27001 (in progress) information security framework" | /trust `<head>` metadata, i.e. the Google snippet and the OG card | None. | Alessandro | SHIPPED | Title: "Trust & Security. Ownership, Data Handling, Compliance Posture". Description leads with ownership and "designed to support applicable … requirements". |
| "DORA — Aligned" | /trust (standards ledger) | No third-party assessment. Some prior engagements were in regulated finance, but that is Michele's employment history, not a Sersan attestation. | Michele | SHIPPED | Status "Design reference"; "Operational-resilience controls — continuity, incident handling, third-party risk — designed in where a financial-services client's obligations require them." |
| "EU AI Act — Ready" | /trust (standards ledger) | No conformity assessment; most Sersan systems are not high-risk and are out of scope entirely. | Michele | SHIPPED | Status "Scope-specific"; controls "built into AI systems whose intended use brings them into scope". |
| "GDPR — Compliant" (a bare status word) | /trust (standards ledger) | GDPR compliance is an ongoing obligation, not a certificate; a one-word badge reads as an attestation. | Alessandro | SHIPPED | Status "Contractual basis"; "DPA on file, data minimisation by default." + `COMPLIANCE.hosting`. |
| "We do not claim compliance certifications we don't hold. We do build systems that pass them." | /trust (standards intro) | This is the honesty asset. It is the *only* claim on the page that is stronger for being unqualified. | — | SHIPPED | Kept verbatim (`COMPLIANCE.noClaims`). Do not soften it. |

## 2. Absolutes and measured guarantees

| claim | page | evidence | owner | status | safe public wording |
|---|---|---|---|---|---|
| "Every agentic system ships with a kill switch that halts it **within 30 seconds**." | /trust (controls) | No SLA instrumentation, no measurement, no test. An unmeasured numeric guarantee in a security section is the worst kind of exposure. | Michele | SHIPPED | "Agentic systems ship with a documented way to stop them, operable by a named person on your side." |
| "TLS 1.3 **across all systems we operate**" | /trust (controls) | Version floors vary by provider and change without notice; "all" cannot be verified. | Michele | SHIPPED | "AES-256 and modern TLS as standard" on the systems we operate. |
| "**All** client-system access is audit-logged." | /trust (controls) | Directly contradicted one row later by "Client systems inherit the client's controls" — we cannot log a client system we do not administer. | Michele | SHIPPED | "logged on the systems we operate. Systems you own keep your own logging." |
| "Client data is **never mixed** between engagements." | /trust (FAQ) | Isolation is a design intent, not an audited guarantee. | Michele | SHIPPED | "Each engagement runs under its own project and credentials, so data stays separated by design." |
| "**regular** security audits" | /trust (FAQ) | No cadence, no auditor, no report. | Michele | REMOVED | Dropped; not replaced. |
| "**No** model or agent change deploys without passing its evaluation suite." | /trust (controls) | True for AI systems that have an eval suite; meaningless for a workflow automation with no model in it. | Michele | SHIPPED | "AI changes are graded against a test set before release, not judged by feel." |
| "Delete engagement data within 30 days of contract termination unless the DPA specifies otherwise" | /trust (controls, retention) | This one **is** operable and is repeated consistently in the retention section. | Alessandro | SHIPPED | Kept as-is. |

## 3. Contradictions that were live simultaneously

| claim | page | evidence | owner | status | safe public wording |
|---|---|---|---|---|---|
| "EU-only data residency unless explicitly agreed otherwise" vs. "Infrastructure is hosted in London (UK)" vs. "Cloud providers in London (UK)" vs. subprocessors "EU-based" — four statements, one page | /trust | The UK left the EU; the site itself runs on Vercel. All four could not be true at once. | Alessandro | SHIPPED | One sentence, imported from `COMPLIANCE.hosting`: "Infrastructure is hosted in the UK and EU. Data residency is agreed per engagement." Used on /trust ×2 and /privacy. |
| "We don't retain rights to anything we build for you" (/trust FAQ) vs. "deliverables become the property of the client **upon full payment**. SERSAN retains rights to its pre-existing know-how, frameworks, and tooling" (/terms §5) | /trust, /terms | The contract is the authority. The FAQ was over-promising against the terms it defers to. | Alessandro | SHIPPED | FAQ now: transfer on full payment, no licence back, "we keep only our pre-existing know-how, frameworks and internal tooling — never your system." /terms §5 additionally confirms source code is included and nothing is withheld. |
| "Full subprocessor list available on request **under NDA**" | /trust (controls) | Putting a subprocessor list behind an NDA is friction, not security; every serious processor publishes one. | Alessandro | SHIPPED | Published inline on /trust and /privacy, now **split by processing context** (see §7): site-collected data = Vercel + Resend only; client-engagement data = cloud hosting and model APIs, scoped per project. Supabase removed — it was never in the request path. **OPEN:** the engagement-side names still need reconciling against the accounts actually in use before the next DPA goes out. |

## 4. The universal-regime problem

| claim | page | evidence | owner | status | safe public wording |
|---|---|---|---|---|---|
| "**Every** Sersan engagement passes the same control points, each backed by the regulation it satisfies." | /trust (hero) | Operationally false and commercially harmful: a £5k workflow automation has no model router and no PII-redaction stage, and promising it that overhead prices the small first project out of existence. | Alessandro | SHIPPED | Hero now leads on ownership (`POSITIONING.ownership`) + "Controls scale with the build." The full proportionality statement (`COMPLIANCE.proportional`) introduces the controls table. |
| "**Every request** through a Sersan system passes the same controlled pipeline." | compliance-pipeline | Same. The six-stage diagram describes a regulated AI system, not every build. | Michele | SHIPPED | "When a system handles sensitive or regulated data, this is the shape we build it in. Simpler systems need fewer of these stages; the diagram shows the full set." |
| "each checkpoint backed by the regulation it satisfies" (diagram footnote) | compliance-pipeline | "Satisfies" asserts conformity. The tags are control references. | Michele | SHIPPED | "the reference each checkpoint maps to, not a certification we hold." |
| The six stage tags themselves (`GDPR`, `EU AI Act Art. 10`, `Art. 14`, `DORA · ISO 27001`) | compliance-pipeline | Frozen copy — the tag strings drive the mobile wrap budget (20 monospace chars at x=158 in a 280-unit viewBox) and `STAGE_KEYS.length` drives the position arrays, stage fractions, idle-light loop and assembly stagger. | Michele | SHIPPED | Unchanged. Six stages, same strings. The framing around them carries the correction. |

## 5. Consent and analytics — the live gap

| claim | page | evidence | owner | status | safe public wording |
|---|---|---|---|---|---|
| Analytics and marketing cookies "Used only with consent" | /cookies | **`@vercel/analytics` mounts unconditionally at `src/app/layout.tsx:334`, and there is no consent banner anywhere in `src/`.** The policy described a mechanism that does not exist. | Alessandro | SHIPPED (policy) / **OPEN (product)** | Policy now describes what actually happens: Vercel Analytics counts page views without cookies, cross-site tracking or ad profiles; marketing cookies: "None." No claim that consent is collected. **The product decision is still open: either ship a consent mechanism or keep analytics strictly cookieless and documented as such.** ePrivacy/PECR treatment of cookieless analytics is not settled — get this reviewed. |
| "Remember preferences such as language or theme" | /cookies | Verified in `src/components/language-provider.tsx:67–86`: a real `sersan_language` cookie, `max-age` 1 year, `SameSite=Lax`, plus `localStorage`. Theme storage was not verified. | Alessandro | SHIPPED | Named precisely: "A sersan_language cookie and local storage remember whether you read the site in English or Italian, for 12 months." The unverified theme claim was dropped. |
| "cookies … placed by third-party services (e.g. analytics, embedded calendars or videos)" | /cookies | No calendar embed is live — `CAL_ENABLED = false` in `src/lib/site.ts` and the Cal.com slug is a documented placeholder that 404s. No video embeds. | Alessandro | SHIPPED | "We currently embed no third-party calendars, video players or advertising tags." |
| "You will not see a consent banner here, because we do not set advertising or profiling cookies." | /cookies | True as of 2026-08-27. Becomes false the moment anyone adds a tag manager. | Alessandro | OPEN | Ships as written, and now states *why*: the language cookie is strictly necessary for a setting the visitor chose, so it is exempt from consent, and the analytics sets no cookies. /privacy §3 states the same basis (see §7). **Tie this line to the analytics decision above — it must be re-checked before any marketing tag is added.** |

## 6. Identity and legal completeness

| claim | page | evidence | owner | status | safe public wording |
|---|---|---|---|---|---|
| /privacy named no legal entity, no registered address, no company number, no legal bases, no subprocessors, no transfer mechanism | /privacy | Companies House 16878386; 128 City Road, London EC1V 2NX. Already carried correctly by /terms and the footer. | Alessandro | SHIPPED | Identity in §1 and §11; Art. 6 bases in §3; subprocessors and SCC/IDTA transfers in §4; 30-day response, client routing and ICO/Garante complaint route in §7. |
| "SERSAN Limited" / "SERSAN" as the legal name | /terms, /privacy, /cookies | Companies House registers **Sersan Limited**. | Alessandro | SHIPPED | "Sersan Limited" in every entity block, with the company number. |
| "SERSAN provides technical consulting … and fractional CTO services" | /terms §2 | Off-charter after the repositioning: describes the old ICP only. | Alessandro | SHIPPED | "SERSAN builds custom software, workflow automation and AI systems, and provides technical audits and fractional technical leadership." |
| "Last updated: January 2026" on three legal pages that were materially edited in August | /privacy, /terms, /cookies | — | Alessandro | SHIPPED | "Last updated: August 2026" (and August 27, 2026 on /trust). |

---

## 7. Legal accuracy pass — second sweep (2026-08-27)

Findings from the seven-dimension audit, applied to /privacy, /cookies, /trust and
the /start intake form.

| claim | page | evidence | owner | status | safe public wording |
|---|---|---|---|---|---|
| "site and database hosting (**Vercel, Supabase**)" published as a subprocessor for data collected through the site | /privacy §4, /trust (controls) | `grep -rn supabase src/ package.json` returns **one** hit, and it is a client's tech stack in `src/data/case-studies.ts`. There is no Supabase dependency, no client, no site database. `/api/intake` and `/api/contact` forward via **Resend** and nothing else; the site and both routes run on **Vercel**; `@vercel/analytics` mounts in `src/app/layout.tsx`. Publishing a processor you do not use is as inaccurate as omitting one you do. | Alessandro | SHIPPED | Split by processing context. /privacy §4: "for data collected through this site, Vercel (site and form hosting, plus cookieless analytics) and Resend (email delivery of your message) — there is no site database. For client-engagement data, subprocessors are scoped per project: typically cloud hosting (AWS, Google Cloud, Azure) and model APIs (Anthropic, OpenAI, Google)." /trust carries the same split in one row. |
| "cookies and similar technologies — **consent**" as the Art. 6 basis | /privacy §3 (legal bases) | Directly contradicted by /cookies, which states — correctly — that no consent is ever collected because the analytics is cookieless. The site does set one cookie: `sersan_language`, `max-age` 1 year, `SameSite=Lax` (`src/components/language-provider.tsx:19,76`). A strictly-necessary preference cookie is exempt from consent; that is the accurate position. | Alessandro | SHIPPED | Both pages now state one basis. /privacy §3: "the language-preference cookie — strictly necessary for a setting you chose yourself, so it is exempt from consent, and our analytics sets no cookies at all." /cookies §5 says the same in the visitor's words. /privacy §8 rewritten to match. |
| Three precise retention periods (30 days / 24 months / 6 months) stated on a page whose own footnote says "this page is a summary; the Privacy Policy and DPA govern" — while /privacy §6 contained **no** periods at all | /trust (retention), /privacy §6 | The summary was summarising something that did not exist in the governing document. | Alessandro | SHIPPED | Periods moved **into** /privacy §6, word-for-word identical to /trust: lead 24 months from last contact; engagement data deleted within 30 days of contract end unless the DPA specifies a longer regulatory hold; hiring 6 months unless the candidate consents to longer. /privacy adds contractual and accounting records "for as long as UK company and tax law requires" (no invented year count). /trust unchanged — it now genuinely summarises. |
| "We don't use your brief for marketing" at the point of collection, against /privacy's stated use "Communicate with you about our services, updates, and **promotions**" | `src/components/start-intake-form.tsx`, /privacy §3 | The form made an absolute promise the policy withdrew two clicks later, and /trust stated a third position ("Marketing communications to opted-in business contacts"). The strictest is the one to publish. | Alessandro | SHIPPED | Form: "By submitting you agree we may reply by email. Your brief isn't used for marketing, and nobody is added to a list without consent." /privacy §3 use-bullet rewritten to "Communicate with you about the work in hand — marketing only with your consent, with an opt-out in every message", which matches the Art. 6 line below it and /trust's Controller list. |
| "We will route any request we receive to the relevant client **within five business days**." | /trust (GDPR roles note) | A timing SLA nobody instruments — same class as the retired 30-second kill switch. There is no ticketing system, no clock, no measurement. | Alessandro | SHIPPED | "without undue delay, and tell you we have" — the GDPR processor standard, and it matches /privacy §7, which already promised to route and to say so. |
| "**Either way** the work runs on cloud providers in the UK and EU, encrypted at rest and in transit…" | /trust (privacy FAQ) | An "every" claim over systems SerSan may not host. The controls list one section above already scopes encryption and logging to "the systems we operate"; the FAQ contradicted that scoping. | Michele | SHIPPED | "Where we host the work, it runs on cloud providers in the UK and EU…" — same guarantee, honestly bounded. |
| "We do not claim compliance certifications we don't hold. We do build systems that pass them." | /trust (standards intro) | Re-checked this pass. Still the strongest line on the page. | — | SHIPPED | Kept verbatim. Unqualified on purpose. Do not add a disclaimer to it. |

**Re-checked and left alone this pass** — these read as absolutes but survive scrutiny:
"AES-256 and modern TLS as standard" (scoped to systems we operate), "delete engagement
data within 30 days" (operable, and now stated identically in the governing document),
"we respond within 30 days" on /privacy §7 (the GDPR statutory maximum, not a
self-invented SLA), and the three AI control rows, which describe a practice rather than
a measured guarantee.

---

## Still open

1. **Footer ISO badge** (`src/components/footer.tsx`) — the ISO claim is removed from /trust
   but still renders on every route. Highest-priority remaining item: the page that
   explains the posture now contradicts the badge above it.
2. **Consent mechanism vs. analytics** — pick one. The cookie policy is honest today
   only because the analytics in use is cookieless.
3. **Subprocessor list** — the *site* half is now verified against the code (Vercel +
   Resend; Supabase removed). The *engagement* half — AWS / Google Cloud / Azure and the
   model APIs — is still a typical-case list, not an account audit. Reconcile it against
   the accounts actually in use, then mirror the same split into the DPA template.
4. **DPA template** — /trust and /privacy both defer to it. Confirm it exists in a
   sendable state and that "Request DPA" resolves to a real document.
5. **Theme-preference storage** — claimed previously, not verified; currently unclaimed.
   If a theme cookie exists, add it back to /cookies §3.
6. **"Regular security audits"** — removed rather than softened. If a cadence is ever
   established, it can come back with a date.
