"use client";

// TODO: wire to a real submission endpoint when backend is ready.
import { useRef, useState } from "react";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/components/language-provider";
import { cn } from "@/lib/utils";
import { CONTACT_EMAIL } from "@/lib/site";

type WorkType = "custom-ai" | "ai-audit" | "fractional" | "other";
type CompanySize = "pre-seed" | "seed-a" | "series-b" | "pe-enterprise";
// Budget enum values match the /api/intake zod schema exactly.
type Budget = "15-50k" | "50-150k" | "150k-plus" | "not-sure";

interface IntakeData {
  workType: WorkType | "";
  outcome: string;
  size: CompanySize | "";
  budget: Budget | "";
  name: string;
  email: string;
  company: string;
}

const initial: IntakeData = {
  workType: "",
  outcome: "",
  size: "",
  budget: "",
  name: "",
  email: "",
  company: "",
};

const workTypeOptions: { value: WorkType; en: string; it: string }[] = [
  { value: "custom-ai", en: "Custom AI build", it: "Sviluppo AI su misura" },
  { value: "ai-audit", en: "AI/ML audit", it: "Audit AI/ML" },
  { value: "fractional", en: "Fractional CTO/CPTO", it: "CTO/CPTO frazionale" },
  { value: "other", en: "Other", it: "Altro" },
];

const sizeOptions: { value: CompanySize; en: string; it: string }[] = [
  { value: "pre-seed", en: "Pre-seed", it: "Pre-seed" },
  { value: "seed-a", en: "Seed – Series A", it: "Seed – Serie A" },
  { value: "series-b", en: "Series B+", it: "Serie B+" },
  { value: "pe-enterprise", en: "PE / Enterprise", it: "PE / Enterprise" },
];

const budgetOptions: { value: Budget; en: string; it: string }[] = [
  { value: "15-50k", en: "£15–50K", it: "£15–50K" },
  { value: "50-150k", en: "£50–150K", it: "£50–150K" },
  { value: "150k-plus", en: "£150K+", it: "£150K+" },
  { value: "not-sure", en: "Not sure yet", it: "Non sono ancora sicuro" },
];

const step1Schema = z.object({
  workType: z.enum(["custom-ai", "ai-audit", "fractional", "other"]),
  outcome: z.string().min(8),
});

const step2Schema = z.object({
  size: z.enum(["pre-seed", "seed-a", "series-b", "pe-enterprise"]),
  budget: z.enum(["15-50k", "50-150k", "150k-plus", "not-sure"]),
});

const step3Schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().min(1),
});

const TOTAL_STEPS = 4;

function copy(language: "en" | "it") {
  const en = {
    eyebrow: "Scoping intake",
    stepLabel: "Step",
    of: "/",
    titles: [
      "Tell us about the work",
      "Scale & stakes",
      "You",
      "Review & send",
    ],
    workQuestion: "What kind of engagement is this?",
    outcomeLabel: "What outcome do you need?",
    outcomePlaceholder:
      "A few sentences: the problem, the constraint, what 'shipped' looks like.",
    sizeQuestion: "Where is the company today?",
    budgetQuestion: "Budget range for the first engagement",
    name: "Name",
    email: "Email",
    company: "Company",
    namePh: "Your name",
    emailPh: "you@company.com",
    companyPh: "Your company",
    back: "Back",
    next: "Next",
    send: "Send intake",
    review: "Review what you're about to send",
    reviewWork: "Work",
    reviewOutcome: "Outcome",
    reviewSize: "Company stage",
    reviewBudget: "Budget",
    reviewName: "Name",
    reviewEmail: "Email",
    reviewCompany: "Company",
    successEyebrow: "Received",
    successTitle: "Thanks. We'll reply within 1 business day.",
    successBody: `A senior engineer reads every inbound. If it's urgent, email ${CONTACT_EMAIL}.`,
    requiredHint: "All fields required to continue.",
    errorWork: "Pick one option.",
    errorOutcome: "A couple of sentences is enough.",
    errorSize: "Pick the closest match.",
    errorBudget: "Pick a range. 'Not sure' is fine.",
    errorName: "Required.",
    errorEmail: "Use a working email.",
    errorCompany: "Required.",
    footer: "Senior reply within 1 business day · No automated funnels",
  };

  const it = {
    eyebrow: "Scoping intake",
    stepLabel: "Passo",
    of: "/",
    titles: [
      "Raccontaci il lavoro",
      "Scala & posta in gioco",
      "Tu",
      "Rivedi e invia",
    ],
    workQuestion: "Che tipo di engagement è?",
    outcomeLabel: "Quale risultato ti serve?",
    outcomePlaceholder:
      "Due righe: il problema, il vincolo, cosa significa 'spedito'.",
    sizeQuestion: "Dove si trova l'azienda oggi?",
    budgetQuestion: "Fascia di budget per il primo engagement",
    name: "Nome",
    email: "Email",
    company: "Azienda",
    namePh: "Il tuo nome",
    emailPh: "tu@azienda.com",
    companyPh: "La tua azienda",
    back: "Indietro",
    next: "Avanti",
    send: "Invia intake",
    review: "Rivedi cosa stai per inviare",
    reviewWork: "Lavoro",
    reviewOutcome: "Risultato",
    reviewSize: "Fase azienda",
    reviewBudget: "Budget",
    reviewName: "Nome",
    reviewEmail: "Email",
    reviewCompany: "Azienda",
    successEyebrow: "Ricevuto",
    successTitle: "Grazie. Risponderemo entro 1 giorno lavorativo.",
    successBody: `Ogni messaggio è letto da un senior engineer. Se è urgente, scrivici a ${CONTACT_EMAIL}.`,
    requiredHint: "Tutti i campi sono richiesti per continuare.",
    errorWork: "Scegli un'opzione.",
    errorOutcome: "Due righe sono sufficienti.",
    errorSize: "Scegli l'opzione più vicina.",
    errorBudget: "Scegli una fascia. 'Non sono sicuro' va bene.",
    errorName: "Richiesto.",
    errorEmail: "Usa un'email funzionante.",
    errorCompany: "Richiesto.",
    footer: "Risposta senior entro 1 giorno lavorativo · Nessun funnel automatico",
  };

  return language === "it" ? it : en;
}

// --- map this component's fields onto the /api/intake schema ---
// The schema (source of truth) wants: name, email, company, role, objective,
// stage, timeline, budget. This form collects workType / outcome / size /
// budget instead, so we translate. workType + company stage are folded into
// role/objective so no captured info is lost; stage/timeline are derived
// sensibly (this short form doesn't ask for them explicitly).
const WORK_TYPE_LABEL: Record<WorkType, string> = {
  "custom-ai": "Custom AI build",
  "ai-audit": "AI/ML audit",
  fractional: "Fractional CTO/CPTO",
  other: "Other",
};

const SIZE_LABEL: Record<CompanySize, string> = {
  "pre-seed": "Pre-seed",
  "seed-a": "Seed – Series A",
  "series-b": "Series B+",
  "pe-enterprise": "PE / Enterprise",
};

type IntakeStage =
  | "idea"
  | "prototype"
  | "internal-pilot"
  | "production"
  | "broken-system";

function deriveStage(workType: WorkType | ""): IntakeStage {
  // An audit implies an existing system; everything else defaults to prototype.
  return workType === "ai-audit" ? "broken-system" : "prototype";
}

function toIntakePayload(data: IntakeData, language: "en" | "it") {
  const workLabel = data.workType ? WORK_TYPE_LABEL[data.workType] : "Engagement";
  return {
    name: data.name,
    email: data.email,
    company: data.company,
    role: data.size ? SIZE_LABEL[data.size] : "—",
    objective: `${workLabel}: ${data.outcome}`,
    stage: deriveStage(data.workType),
    timeline: "exploring" as const,
    budget: data.budget || "not-sure",
    language,
  };
}

interface ChipProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function Chip({ active, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      role="radio"
      onClick={onClick}
      aria-checked={active}
      className={cn(
        "w-full text-left px-4 py-3 rounded-md text-sm transition-colors backdrop-blur-sm",
        "bg-surface-elev border",
        active
          ? "border-[hsl(var(--accent))] text-ink shadow-[0_0_0_1px_hsl(var(--accent)/0.6),0_8px_24px_-14px_hsl(var(--accent)/0.55)]"
          : "border-rule/60 text-ink-mute hover:border-[hsl(var(--accent)/0.5)] hover:text-ink",
      )}
    >
      <span className="inline-flex items-center gap-2">
        <span
          className={cn(
            "inline-block w-1.5 h-1.5 rounded-full transition-colors",
            active ? "bg-[hsl(var(--accent))]" : "bg-[hsl(var(--rule)/0.8)]",
          )}
          aria-hidden="true"
        />
        {children}
      </span>
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-mute mb-1.5 block">
      {children}
    </span>
  );
}

function ErrorLine({ id, msg }: { id?: string; msg?: string }) {
  if (!msg) return null;
  return (
    <p id={id} role="alert" className="text-[11px] mt-1.5 text-destructive">
      {msg}
    </p>
  );
}

// Stable id for a field's inline error message, used by aria-describedby.
const errId = (field: string) => `intake-${field}-error`;

export function MultiStepIntake() {
  const { language } = useLanguage();
  const t = copy(language);

  const [step, setStep] = useState(1);
  const [data, setData] = useState<IntakeData>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // Refs for moving focus to the first invalid field after a failed step.
  // Chip-group steps (workType/size/budget) focus their group wrapper; text
  // fields focus the input/textarea directly.
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const setFieldRef = (field: string) => (el: HTMLElement | null) => {
    fieldRefs.current[field] = el;
  };
  function focusFirstInvalid(e: Record<string, string>) {
    const order = [
      "workType",
      "outcome",
      "size",
      "budget",
      "name",
      "email",
      "company",
    ];
    const first = order.find((k) => e[k]);
    if (!first) return;
    requestAnimationFrame(() => fieldRefs.current[first]?.focus());
  }

  function update<K extends keyof IntakeData>(key: K, value: IntakeData[K]) {
    setData((d) => ({ ...d, [key]: value }));
    if (errors[key as string]) {
      setErrors((e) => {
        const next = { ...e };
        delete next[key as string];
        return next;
      });
    }
  }

  function validate(s: number): boolean {
    if (s === 1) {
      const r = step1Schema.safeParse({
        workType: data.workType || undefined,
        outcome: data.outcome,
      });
      if (!r.success) {
        const e: Record<string, string> = {};
        if (!data.workType) e.workType = t.errorWork;
        if (data.outcome.trim().length < 8) e.outcome = t.errorOutcome;
        setErrors(e);
        focusFirstInvalid(e);
        return false;
      }
      return true;
    }
    if (s === 2) {
      const r = step2Schema.safeParse({
        size: data.size || undefined,
        budget: data.budget || undefined,
      });
      if (!r.success) {
        const e: Record<string, string> = {};
        if (!data.size) e.size = t.errorSize;
        if (!data.budget) e.budget = t.errorBudget;
        setErrors(e);
        focusFirstInvalid(e);
        return false;
      }
      return true;
    }
    if (s === 3) {
      const r = step3Schema.safeParse({
        name: data.name,
        email: data.email,
        company: data.company,
      });
      if (!r.success) {
        const e: Record<string, string> = {};
        if (!data.name.trim()) e.name = t.errorName;
        const emailOk = z.string().email().safeParse(data.email).success;
        if (!emailOk) e.email = t.errorEmail;
        if (!data.company.trim()) e.company = t.errorCompany;
        setErrors(e);
        focusFirstInvalid(e);
        return false;
      }
      return true;
    }
    return true;
  }

  function handleNext() {
    if (validate(step)) {
      setErrors({});
      setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    }
  }

  function handleBack() {
    setErrors({});
    setStep((s) => Math.max(s - 1, 1));
  }

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!validate(3)) {
      setStep(3);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toIntakePayload(data, language)),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        const msg =
          json && typeof json.error === "string" ? json.error : "Request failed";
        throw new Error(msg);
      }
      setSubmitted(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-surface-elev border border-rule/40 rounded-xl p-8 sm:p-10 text-center">
        <p
          className="text-[10px] font-mono uppercase tracking-[0.18em] mb-3"
          style={{ color: "hsl(var(--accent))" }}
        >
          {t.successEyebrow}
        </p>
        <h3 className="heading-3 mb-3">{t.successTitle}</h3>
        <p className="text-sm text-ink-mute leading-[1.6] max-w-md mx-auto">
          {t.successBody}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-elev border border-rule/40 rounded-xl p-6 sm:p-8">
      {/* Progress + step counter */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-mute">
          {t.eyebrow}
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
              const n = i + 1;
              const state =
                n < step ? "done" : n === step ? "active" : "future";
              return (
                <span
                  key={n}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-colors",
                    state === "active" && "bg-[hsl(var(--accent))]",
                    state === "done" && "bg-[hsl(var(--accent)/0.55)]",
                    state === "future" && "bg-[hsl(var(--rule))]",
                  )}
                />
              );
            })}
          </div>
          <p
            className="text-[10px] font-mono uppercase tracking-[0.18em]"
            style={{ color: "hsl(var(--accent))" }}
          >
            {t.stepLabel} {String(step).padStart(2, "0")}
            <span className="text-ink-mute">
              {" "}
              {t.of} {String(TOTAL_STEPS).padStart(2, "0")}
            </span>
          </p>
        </div>
      </div>

      <h3 className="heading-3 mb-6">{t.titles[step - 1]}</h3>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <FieldLabel>{t.workQuestion}</FieldLabel>
            <div
              role="radiogroup"
              aria-label={t.workQuestion}
              aria-invalid={errors.workType ? true : undefined}
              aria-describedby={errors.workType ? errId("workType") : undefined}
              ref={setFieldRef("workType")}
              tabIndex={-1}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
            >
              {workTypeOptions.map((opt) => (
                <Chip
                  key={opt.value}
                  active={data.workType === opt.value}
                  onClick={() => update("workType", opt.value)}
                >
                  {language === "it" ? opt.it : opt.en}
                </Chip>
              ))}
            </div>
            <ErrorLine id={errId("workType")} msg={errors.workType} />
          </div>

          <div>
            <FieldLabel>{t.outcomeLabel}</FieldLabel>
            <Textarea
              ref={setFieldRef("outcome")}
              value={data.outcome}
              onChange={(e) => update("outcome", e.target.value)}
              placeholder={t.outcomePlaceholder}
              rows={5}
              aria-invalid={errors.outcome ? true : undefined}
              aria-describedby={errors.outcome ? errId("outcome") : undefined}
            />
            <ErrorLine id={errId("outcome")} msg={errors.outcome} />
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <FieldLabel>{t.sizeQuestion}</FieldLabel>
            <div
              role="radiogroup"
              aria-label={t.sizeQuestion}
              aria-invalid={errors.size ? true : undefined}
              aria-describedby={errors.size ? errId("size") : undefined}
              ref={setFieldRef("size")}
              tabIndex={-1}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
            >
              {sizeOptions.map((opt) => (
                <Chip
                  key={opt.value}
                  active={data.size === opt.value}
                  onClick={() => update("size", opt.value)}
                >
                  {language === "it" ? opt.it : opt.en}
                </Chip>
              ))}
            </div>
            <ErrorLine id={errId("size")} msg={errors.size} />
          </div>

          <div>
            <FieldLabel>{t.budgetQuestion}</FieldLabel>
            <div
              role="radiogroup"
              aria-label={t.budgetQuestion}
              aria-invalid={errors.budget ? true : undefined}
              aria-describedby={errors.budget ? errId("budget") : undefined}
              ref={setFieldRef("budget")}
              tabIndex={-1}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
            >
              {budgetOptions.map((opt) => (
                <Chip
                  key={opt.value}
                  active={data.budget === opt.value}
                  onClick={() => update("budget", opt.value)}
                >
                  {language === "it" ? opt.it : opt.en}
                </Chip>
              ))}
            </div>
            <ErrorLine id={errId("budget")} msg={errors.budget} />
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <FieldLabel>{t.name}</FieldLabel>
              <Input
                ref={setFieldRef("name")}
                type="text"
                value={data.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder={t.namePh}
                autoComplete="name"
                required
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? errId("name") : undefined}
              />
              <ErrorLine id={errId("name")} msg={errors.name} />
            </label>
            <label className="block">
              <FieldLabel>{t.email}</FieldLabel>
              <Input
                ref={setFieldRef("email")}
                type="email"
                value={data.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder={t.emailPh}
                autoComplete="email"
                required
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? errId("email") : undefined}
              />
              <ErrorLine id={errId("email")} msg={errors.email} />
            </label>
          </div>
          <label className="block">
            <FieldLabel>{t.company}</FieldLabel>
            <Input
              ref={setFieldRef("company")}
              type="text"
              value={data.company}
              onChange={(e) => update("company", e.target.value)}
              placeholder={t.companyPh}
              autoComplete="organization"
              required
              aria-invalid={errors.company ? true : undefined}
              aria-describedby={errors.company ? errId("company") : undefined}
            />
            <ErrorLine id={errId("company")} msg={errors.company} />
          </label>
          <p className="text-[11px] text-ink-mute">{t.requiredHint}</p>
        </div>
      )}

      {/* Step 4 — review */}
      {step === 4 && (
        <div className="space-y-4">
          <p className="text-sm text-ink-mute mb-2">{t.review}</p>
          <dl className="rounded-lg border border-rule/60 bg-surface/40 divide-y divide-rule/40">
            {[
              {
                label: t.reviewWork,
                value:
                  workTypeOptions.find((o) => o.value === data.workType)?.[
                    language === "it" ? "it" : "en"
                  ] || "—",
              },
              { label: t.reviewOutcome, value: data.outcome || "—" },
              {
                label: t.reviewSize,
                value:
                  sizeOptions.find((o) => o.value === data.size)?.[
                    language === "it" ? "it" : "en"
                  ] || "—",
              },
              {
                label: t.reviewBudget,
                value:
                  budgetOptions.find((o) => o.value === data.budget)?.[
                    language === "it" ? "it" : "en"
                  ] || "—",
              },
              { label: t.reviewName, value: data.name || "—" },
              { label: t.reviewEmail, value: data.email || "—" },
              { label: t.reviewCompany, value: data.company || "—" },
            ].map((row) => (
              <div
                key={row.label}
                className="px-4 py-3 grid grid-cols-[10rem,1fr] gap-3 items-baseline"
              >
                <dt className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-mute">
                  {row.label}
                </dt>
                <dd className="text-sm text-ink leading-[1.5] whitespace-pre-wrap">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Nav */}
      <div className="mt-8 flex items-center justify-between gap-4">
        <Button
          type="button"
          variant="ghost"
          onClick={handleBack}
          disabled={step === 1}
          className="gap-2 disabled:opacity-30"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.back}
        </Button>

        {step < TOTAL_STEPS ? (
          <Button
            type="button"
            variant="hero"
            onClick={handleNext}
            className="gap-2 group"
          >
            {t.next}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="hero"
            onClick={handleSubmit}
            disabled={submitting}
            className="gap-2 group"
          >
            <Mail className="w-4 h-4" />
            {submitting ? (language === "en" ? "Sending…" : "Invio…") : t.send}
            {!submitting && <Check className="w-4 h-4" />}
          </Button>
        )}
      </div>

      {submitError && (
        <div
          role="alert"
          className="mt-4 text-center text-sm"
          style={{ color: "hsl(var(--refusal))" }}
        >
          <p>
            {language === "en"
              ? `We couldn't send that. Mind retrying, or email ${CONTACT_EMAIL} directly?`
              : `Non siamo riusciti a inviare. Riprova, o scrivi direttamente a ${CONTACT_EMAIL}.`}
          </p>
          <p className="mt-1 text-[11px] text-ink-mute font-mono">{submitError}</p>
        </div>
      )}

      <p className="mt-6 text-[10px] font-mono uppercase tracking-[0.14em] text-ink-mute text-center">
        {t.footer}
      </p>
    </div>
  );
}
