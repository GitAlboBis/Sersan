"use client";

import { useRef, useState } from "react";
import { ArrowRight, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, CTA_WRAP_SM } from "@/components/ui/button";
import { Input, FIELD_CONTROL } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/components/language-provider";
import { getLenis } from "@/lib/lenis-singleton";
import {
  BUDGET_BANDS,
  BUDGET_REASSURANCE,
  CTA,
  type BudgetValue,
  pick,
} from "@/data/copy";

/**
 * StartIntakeForm — the /start page form.
 *
 * Field contract mirrors src/app/api/intake/route.ts (zod schema). Keep
 * the two in sync. The form intentionally renders all fields on one page —
 * whoever fills it in should see the full ask up front, not be surprised by
 * a five-step wizard. Only four fields are required (name, email, company,
 * objective); everything else is optional context.
 *
 * State machine: idle → submitting → success | error
 *   - success replaces the form with a confirmation panel
 *   - error keeps the form intact and shows the inline message
 *
 * Submit posts to /api/intake. We don't surface field-level server errors;
 * client validation catches the common cases and the server is authoritative
 * for the rest.
 *
 * Controls come from the shared primitives (`ui/input`, `ui/textarea`). This
 * form used to carry its own FIELD_BASE constant with a hardcoded
 * `text-[14px]`, which no root-font change could reach — so every one of its
 * 12 controls force-zoomed iOS Safari on focus, rescaling the visual
 * viewport and desynchronising every pinned ScrollTrigger on the page
 * (MOBILE_AUDIT D-5). `<select>` has no primitive, so it composes
 * FIELD_CONTROL directly rather than re-forking.
 */

type Situation =
  | "manual-process"
  | "tools-not-talking"
  | "software-to-build"
  | "product-idea"
  | "system-struggling"
  | "ai-worth-it"
  | "none";
type Stage = "manual-today" | "idea" | "prototype" | "in-use" | "needs-fixing";
type Timeline = "asap" | "this-month" | "this-quarter" | "exploring";
/** Budget values are owned by BUDGET_BANDS in @/data/copy so the two intake
 *  forms and the API zod enum cannot drift apart again. */
type Budget = BudgetValue;

interface FormState {
  situation: Situation | "";
  name: string;
  email: string;
  company: string;
  role: string;
  objective: string;
  stage: Stage | "";
  timeline: Timeline | "";
  budget: Budget | "";
  stack: string;
  compliance: string;
  links: string;
}

const EMPTY: FormState = {
  situation: "",
  name: "",
  email: "",
  company: "",
  role: "",
  objective: "",
  stage: "",
  timeline: "",
  budget: "",
  stack: "",
  compliance: "",
  links: "",
};

/** Self-locator — the business problems a visitor can recognise themselves
 *  in, from one manual process up to a system that is struggling. Optional,
 *  and deliberately readable by someone who is not an engineer. */
const SITUATION_OPTIONS: { value: Situation; label: string; labelIt: string }[] = [
  {
    value: "manual-process",
    label: "A manual process is eating your team's time.",
    labelIt: "Un processo manuale sta divorando il tempo del vostro team.",
  },
  {
    value: "tools-not-talking",
    label: "Your tools don't talk to each other.",
    labelIt: "I vostri strumenti non si parlano tra loro.",
  },
  {
    value: "software-to-build",
    label: "You need internal software that doesn't exist yet.",
    labelIt: "Vi serve un software interno che ancora non esiste.",
  },
  {
    value: "product-idea",
    label: "You have a product idea and need it built properly.",
    labelIt: "Avete un'idea di prodotto e vi serve costruirla bene.",
  },
  {
    value: "system-struggling",
    label: "An existing system is slow, fragile, or breaking.",
    labelIt: "Un sistema esistente è lento, fragile o si rompe.",
  },
  {
    value: "ai-worth-it",
    label: "You want to know whether AI is worth it here.",
    labelIt: "Volete capire se qui l'AI valga davvero la pena.",
  },
  {
    value: "none",
    label: "None of these quite fit?",
    labelIt: "Nessuna di queste calza del tutto?",
  },
];

const STAGE_OPTIONS: { value: Stage; label: string; labelIt: string }[] = [
  {
    value: "manual-today",
    label: "Manual today: people, spreadsheets, email",
    labelIt: "Oggi è manuale: persone, fogli di calcolo, email",
  },
  {
    value: "idea",
    label: "Idea: deciding whether to build it",
    labelIt: "Idea: stiamo decidendo se costruirlo",
  },
  {
    value: "prototype",
    label: "Early version exists, not in real use",
    labelIt: "Esiste una prima versione, non ancora in uso",
  },
  {
    value: "in-use",
    label: "In use: people depend on it daily",
    labelIt: "In uso: ci lavorano persone ogni giorno",
  },
  {
    value: "needs-fixing",
    label: "Existing system that needs fixing",
    labelIt: "Un sistema esistente che va sistemato",
  },
];

const TIMELINE_OPTIONS: { value: Timeline; label: string; labelIt: string }[] = [
  { value: "asap", label: "ASAP", labelIt: "Il prima possibile" },
  { value: "this-month", label: "This month", labelIt: "Questo mese" },
  { value: "this-quarter", label: "This quarter", labelIt: "Questo trimestre" },
  { value: "exploring", label: "Exploring", labelIt: "In esplorazione" },
];

/** Bands come from @/data/copy — the single source shared with the
 *  /consulting intake and the /api/intake zod enum. */
const BUDGET_OPTIONS = BUDGET_BANDS;

type SubmitState = "idle" | "submitting" | "success" | "error";

// Stable id for the inline error alert — fields point aria-describedby here
// when they're the flagged invalid field.
const ERROR_ID = "intake-form-error";

/** `<select>` has no shared primitive, so it composes the same shell as
 *  `<Input>` (44px tall, 16px on touch) and only adds the select-specific
 *  bits: native chrome off, room for the chevron drawn in `SELECT_CHEVRON`.
 *  The `focus:` pair mirrors the shell's `focus-visible:` treatment so a
 *  pointer-opened select rings the same way it always has here. */
const SELECT_FIELD = cn(
  FIELD_CONTROL,
  "block appearance-none cursor-pointer pr-8",
  "focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/30 focus:ring-offset-0",
);

/** Inline because it is a data-URI background-image, not a utility. */
const SELECT_CHEVRON: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='none' stroke='%239aa3ad' stroke-width='1.5' d='M1 1l4 4 4-4'/></svg>\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
};

const LABEL =
  "block font-mono text-[10px] tracking-[0.18em] uppercase text-ink-mute mb-1.5";
const REQ = (
  <span aria-hidden="true" className="text-[hsl(var(--accent))]">
    *
  </span>
);

/**
 * Move focus to a failed field without letting the browser scroll for us.
 *
 * `preventScroll` matters twice on a phone: the browser's own focus-scroll
 * parks the field under the fixed navbar, and it fights Lenis, which owns
 * the document scroll position. So we scroll deliberately and centre the
 * control — through Lenis when it is running, natively when it is not
 * (reduced motion tears Lenis down entirely). Same contract as
 * multi-step-intake.tsx.
 */
function focusFailedField(el: HTMLElement) {
  el.focus({ preventScroll: true });
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lenis = getLenis();
  if (lenis && !reduced) {
    // Absolute target, not an element + offset: Lenis resolves element
    // targets against layout in a way that drifts once the page is deep in
    // its own scroll, and a number is unambiguous.
    const rect = el.getBoundingClientRect();
    const target =
      window.scrollY + rect.top - (window.innerHeight - rect.height) / 2;
    lenis.scrollTo(Math.max(0, target));
    return;
  }
  el.scrollIntoView({ block: "center", behavior: "auto" });
}

export default function StartIntakeForm() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string | null>(null);
  // Which field the validation gate flagged — drives aria-invalid on that
  // field and lets us move focus to it on a failed submit.
  const [invalidField, setInvalidField] = useState<keyof FormState | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (invalidField === key) setInvalidField(null);
  }

  // Set the error + the offending field, then move focus to it so keyboard /
  // screen-reader users are taken straight to what needs fixing — and put it
  // in the middle of the screen rather than wherever the browser drops it
  // (see focusFailedField).
  function fail(field: keyof FormState, message: string) {
    setError(message);
    setInvalidField(field);
    requestAnimationFrame(() => {
      const el = formRef.current?.elements.namedItem(field) as
        | HTMLElement
        | null;
      if (el) focusFailedField(el);
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInvalidField(null);

    // Client-side gates — the server is authoritative but these stop the
    // obvious early misses without a round-trip.
    if (!form.name.trim())
      return fail("name", isEn ? "Add your name." : "Inserite il vostro nome.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return fail(
        "email",
        isEn
          ? "That email doesn't look right."
          : "Questa email non sembra corretta.",
      );
    if (!form.company.trim())
      return fail(
        "company",
        isEn ? "Company name?" : "Nome dell'azienda?",
      );
    if (form.objective.trim().length < 8)
      return fail(
        "objective",
        isEn
          ? "A sentence or two about what you're trying to solve."
          : "Una frase o due su cosa volete risolvere.",
      );
    // Everything below (role, situation, stage, timeline, budget, stack,
    // constraints, links) is optional context — it never blocks a brief.

    setSubmitState("submitting");
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Optional enums are unions server-side — omit them when unanswered
        // instead of sending an empty string (which no enum accepts).
        body: JSON.stringify({
          ...form,
          situation: form.situation || undefined,
          stage: form.stage || undefined,
          timeline: form.timeline || undefined,
          budget: form.budget || undefined,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSubmitState("success");
    } catch (err) {
      console.error("[start] submit failed:", err);
      setSubmitState("error");
      setError(
        isEn
          ? "Something went wrong on our end. Try again, or email alex.s@sersan.dev directly."
          : "Qualcosa è andato storto dalla nostra parte. Riprovate, oppure scriveteci direttamente a alex.s@sersan.dev.",
      );
    }
  }

  if (submitState === "success") {
    return (
      <div className="rounded-lg border border-[hsl(var(--accent)/0.4)] bg-[hsl(var(--accent)/0.06)] p-8 sm:p-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex items-center justify-center w-9 h-9 rounded-full bg-[hsl(var(--accent)/0.18)] border border-[hsl(var(--accent)/0.5)]">
            <Check
              className="w-4 h-4 text-[hsl(var(--accent))]"
              aria-hidden="true"
            />
          </span>
          <h3 className="font-display text-2xl text-ink leading-tight">
            {isEn ? "Brief received." : "Brief ricevuto."}
          </h3>
        </div>
        <p className="text-[15px] text-ink leading-relaxed mb-3">
          {isEn ? (
            <>
              Thanks, {form.name.split(" ")[0]}. A founder reads it, and
              we&apos;ll reply with a recommended next step within one
              business day.
            </>
          ) : (
            <>
              Grazie, {form.name.split(" ")[0]}. Lo legge un founder, e vi
              risponderemo con il prossimo passo consigliato entro un giorno
              lavorativo.
            </>
          )}
        </p>
        <p className="text-[13.5px] text-ink-mute leading-relaxed">
          {isEn
            ? "If it's urgent, reply to the confirmation email and we'll prioritise."
            : "Se è urgente, rispondete all'email di conferma e daremo priorità."}
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      {/* Self-locator — first question, optional. Pains moved verbatim from
          the retired homepage UseCasesSection. */}
      <div>
        <label htmlFor="situation" className={LABEL}>
          {isEn
            ? "Which of these sounds like you? (optional)"
            : "Quale di queste vi somiglia? (facoltativo)"}
        </label>
        <select
          id="situation"
          name="situation"
          value={form.situation}
          onChange={(e) => update("situation", e.target.value as Situation)}
          className={SELECT_FIELD}
          style={SELECT_CHEVRON}
        >
          <option value="">{isEn ? "Select…" : "Seleziona…"}</option>
          {SITUATION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {isEn ? o.label : o.labelIt}
            </option>
          ))}
        </select>
      </div>

      {/* Identity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <div>
          <label htmlFor="name" className={LABEL}>
            {isEn ? "Name" : "Nome"} {REQ}
          </label>
          <Input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            autoCapitalize="words"
            required
            aria-invalid={invalidField === "name" || undefined}
            aria-describedby={invalidField === "name" ? ERROR_ID : undefined}
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder={isEn ? "Your full name" : "Nome e cognome"}
          />
        </div>
        <div>
          <label htmlFor="email" className={LABEL}>
            {isEn ? "Work email" : "Email di lavoro"} {REQ}
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            aria-invalid={invalidField === "email" || undefined}
            aria-describedby={invalidField === "email" ? ERROR_ID : undefined}
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder={isEn ? "you@company.com" : "tu@azienda.com"}
          />
        </div>
        <div>
          <label htmlFor="company" className={LABEL}>
            {isEn ? "Company" : "Azienda"} {REQ}
          </label>
          <Input
            id="company"
            name="company"
            type="text"
            autoComplete="organization"
            required
            aria-invalid={invalidField === "company" || undefined}
            aria-describedby={invalidField === "company" ? ERROR_ID : undefined}
            value={form.company}
            onChange={(e) => update("company", e.target.value)}
            placeholder={isEn ? "Company name" : "Nome dell'azienda"}
          />
        </div>
        <div>
          <label htmlFor="role" className={LABEL}>
            {isEn ? "Role (optional)" : "Ruolo (facoltativo)"}
          </label>
          <Input
            id="role"
            name="role"
            type="text"
            autoComplete="organization-title"
            aria-invalid={invalidField === "role" || undefined}
            aria-describedby={invalidField === "role" ? ERROR_ID : undefined}
            value={form.role}
            onChange={(e) => update("role", e.target.value)}
            placeholder={
              isEn
                ? "Founder · Operations · Product · Other"
                : "Founder · Operations · Prodotto · Altro"
            }
          />
        </div>
      </div>

      {/* Objective */}
      <div>
        <label htmlFor="objective" className={LABEL}>
          {isEn
            ? "What are you trying to build, automate, or fix?"
            : "Cosa state cercando di costruire, automatizzare o sistemare?"}{" "}
          {REQ}
        </label>
        <Textarea
          id="objective"
          name="objective"
          required
          rows={4}
          aria-invalid={invalidField === "objective" || undefined}
          aria-describedby={invalidField === "objective" ? ERROR_ID : undefined}
          value={form.objective}
          onChange={(e) => update("objective", e.target.value)}
          placeholder={
            isEn
              ? "Two or three sentences is plenty. What's slow, manual, or missing?"
              : "Bastano due o tre frasi. Cosa è lento, manuale o manca del tutto?"
          }
          className="min-h-[8rem]"
        />
      </div>

      {/* Stage / Timeline / Budget */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <div>
          <label htmlFor="stage" className={LABEL}>
            {isEn ? "Where you are" : "A che punto siete"}
          </label>
          <select
            id="stage"
            name="stage"
            aria-invalid={invalidField === "stage" || undefined}
            aria-describedby={invalidField === "stage" ? ERROR_ID : undefined}
            value={form.stage}
            onChange={(e) => update("stage", e.target.value as Stage)}
            className={SELECT_FIELD}
            style={SELECT_CHEVRON}
          >
            <option value="">{isEn ? "Select…" : "Seleziona…"}</option>
            {STAGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {isEn ? o.label : o.labelIt}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="timeline" className={LABEL}>
            {isEn ? "Timeline" : "Tempistiche"}
          </label>
          <select
            id="timeline"
            name="timeline"
            aria-invalid={invalidField === "timeline" || undefined}
            aria-describedby={invalidField === "timeline" ? ERROR_ID : undefined}
            value={form.timeline}
            onChange={(e) => update("timeline", e.target.value as Timeline)}
            className={SELECT_FIELD}
            style={SELECT_CHEVRON}
          >
            <option value="">{isEn ? "Select…" : "Seleziona…"}</option>
            {TIMELINE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {isEn ? o.label : o.labelIt}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="budget" className={LABEL}>
            {isEn ? "Budget" : "Budget"}
          </label>
          <select
            id="budget"
            name="budget"
            aria-invalid={invalidField === "budget" || undefined}
            aria-describedby={invalidField === "budget" ? ERROR_ID : undefined}
            value={form.budget}
            onChange={(e) => update("budget", e.target.value as Budget)}
            className={SELECT_FIELD}
            style={SELECT_CHEVRON}
          >
            <option value="">{isEn ? "Select…" : "Seleziona…"}</option>
            {BUDGET_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {isEn ? o.en : o.it}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Budget reassurance — the question above is optional, and a visitor
          who has no number yet should not stall here. */}
      <p className="-mt-2 text-[12.5px] text-ink-mute leading-relaxed">
        {pick(isEn, BUDGET_REASSURANCE)}
      </p>

      {/* Optional context */}
      <div>
        <label htmlFor="stack" className={LABEL}>
          {isEn
            ? "Current tools or technology (optional)"
            : "Strumenti o tecnologie attuali (facoltativo)"}
        </label>
        <Input
          id="stack"
          name="stack"
          type="text"
          autoComplete="off"
          autoCapitalize="none"
          value={form.stack}
          onChange={(e) => update("stack", e.target.value)}
          placeholder={
            isEn
              ? "Excel, HubSpot, WordPress, custom software — or leave blank."
              : "Excel, HubSpot, WordPress, software su misura — o lasciate vuoto."
          }
        />
      </div>
      <div>
        <label htmlFor="compliance" className={LABEL}>
          {isEn
            ? "Security or regulatory constraints (optional)"
            : "Vincoli di sicurezza o normativi (facoltativo)"}
        </label>
        <Input
          id="compliance"
          name="compliance"
          type="text"
          autoComplete="off"
          value={form.compliance}
          onChange={(e) => update("compliance", e.target.value)}
          placeholder={
            isEn
              ? "Customer data, an industry regulator, an internal policy…"
              : "Dati dei clienti, un'autorità di settore, una policy interna…"
          }
        />
      </div>
      <div>
        <label htmlFor="links" className={LABEL}>
          {isEn
            ? "Links or extra context (optional)"
            : "Link o contesto aggiuntivo (facoltativo)"}
        </label>
        <Textarea
          id="links"
          name="links"
          rows={3}
          // A URL keyboard on touch — the field is a list of links, and the
          // `.`/`/` keys are the ones that matter here.
          inputMode="url"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={form.links}
          onChange={(e) => update("links", e.target.value)}
          placeholder={
            isEn
              ? "A link, a document, a screenshot — anything that helps us read in."
              : "Un link, un documento, uno screenshot — qualsiasi cosa ci aiuti a capire."
          }
          className="min-h-[6rem]"
        />
      </div>

      {/* Error — success branch returns early above, so we only need to gate
          on `error` being set */}
      {error && (
        <div
          id={ERROR_ID}
          role="alert"
          className="flex items-start gap-2.5 rounded-md border border-[hsl(0_70%_55%/0.35)] bg-[hsl(0_70%_55%/0.06)] px-4 py-3"
        >
          <AlertCircle
            className="w-4 h-4 text-[hsl(0_70%_65%)] mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <p className="text-[13.5px] text-ink leading-relaxed">{error}</p>
        </div>
      )}

      {/* Submit */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
        <Button
          type="submit"
          variant="hero"
          size="xl"
          disabled={submitState === "submitting"}
          className={cn("group w-full sm:w-auto", CTA_WRAP_SM)}
        >
          {submitState === "submitting"
            ? isEn
              ? "Sending…"
              : "Invio in corso…"
            : pick(isEn, CTA.primary)}
          {submitState !== "submitting" && (
            <ArrowRight
              className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden="true"
            />
          )}
        </Button>
        <p className="text-[12px] text-ink-mute/80 leading-relaxed">
          {isEn
            ? "By submitting you agree we may reply by email. We don't use your brief for marketing."
            : "Inviando, acconsentite a ricevere una nostra risposta via email. Non usiamo il vostro brief per finalità di marketing."}
        </p>
      </div>
    </form>
  );
}
