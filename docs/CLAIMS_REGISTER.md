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
| "Full subprocessor list available on request **under NDA**" | /trust (controls) | Putting a subprocessor list behind an NDA is friction, not security; every serious processor publishes one. | Alessandro | SHIPPED | Published inline on /trust and /privacy: AWS, Google Cloud, Azure, Vercel, Supabase, Anthropic, OpenAI, Google, Resend. **OPEN:** the list must be reconciled against the accounts actually in use before the next DPA goes out. |

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
| "You will not see a consent banner here, because we do not set advertising or profiling cookies." | /cookies | True as of 2026-08-27. Becomes false the moment anyone adds a tag manager. | Alessandro | OPEN | Ships as written. **Tie this line to the analytics decision above — it must be re-checked before any marketing tag is added.** |

## 6. Identity and legal completeness

| claim | page | evidence | owner | status | safe public wording |
|---|---|---|---|---|---|
| /privacy named no legal entity, no registered address, no company number, no legal bases, no subprocessors, no transfer mechanism | /privacy | Companies House 16878386; 128 City Road, London EC1V 2NX. Already carried correctly by /terms and the footer. | Alessandro | SHIPPED | Identity in §1 and §11; Art. 6 bases in §3; subprocessors and SCC/IDTA transfers in §4; 30-day response, client routing and ICO/Garante complaint route in §7. |
| "SERSAN Limited" / "SERSAN" as the legal name | /terms, /privacy, /cookies | Companies House registers **Sersan Limited**. | Alessandro | SHIPPED | "Sersan Limited" in every entity block, with the company number. |
| "SERSAN provides technical consulting … and fractional CTO services" | /terms §2 | Off-charter after the repositioning: describes the old ICP only. | Alessandro | SHIPPED | "SERSAN builds custom software, workflow automation and AI systems, and provides technical audits and fractional technical leadership." |
| "Last updated: January 2026" on three legal pages that were materially edited in August | /privacy, /terms, /cookies | — | Alessandro | SHIPPED | "Last updated: August 2026" (and August 27, 2026 on /trust). |

---

## Still open

1. **Footer ISO badge** (`src/components/footer.tsx`) — the ISO claim is removed from /trust
   but still renders on every route. Highest-priority remaining item: the page that
   explains the posture now contradicts the badge above it.
2. **Consent mechanism vs. analytics** — pick one. The cookie policy is honest today
   only because the analytics in use is cookieless.
3. **Subprocessor list** — reconcile the published names against the accounts actually
   in use, then mirror the same list into the DPA template.
4. **DPA template** — /trust and /privacy both defer to it. Confirm it exists in a
   sendable state and that "Request DPA" resolves to a real document.
5. **Theme-preference storage** — claimed previously, not verified; currently unclaimed.
   If a theme cookie exists, add it back to /cookies §3.
6. **"Regular security audits"** — removed rather than softened. If a cadence is ever
   established, it can come back with a date.
