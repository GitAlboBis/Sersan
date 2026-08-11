"use client";

// Submits to POST /api/intake (see the field mapping near the submit handler);
// the route validates against its zod schema and emails ops when configured.
import { Fragment, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/components/language-provider";
import { cn } from "@/lib/utils";
import { CONTACT_EMAIL } from "@/lib/site";

// Idempotent (navbar registers it too); keeps @gsap/react's React-version
// interop shims active for the hooks below.
gsap.registerPlugin(useGSAP);

/**
 * Step-pane choreography — exit-before-enter on a height-managed shell.
 *
 * The panes are still conditionally rendered (one at a time; React owns the
 * DOM), but the SWAP is deferred: Next/Back first plays the outgoing fields
 * away (short power2.in half), and only its onComplete commits `setStep`.
 * A `pendingPaneRef` handshake carries direction + focus intent across the
 * commit; the `useGSAP` effect keyed on `step` then (a) hides the incoming
 * fields BEFORE first paint (layout-effect timing — no flash possible),
 * (b) tweens the shell from the frozen outgoing height to the measured
 * incoming height so the page below glides instead of jumping, and (c)
 * cascades the fields in (long expo.out half). Back mirrors the direction so
 * the form has spatial memory: forward exits up/enters from below, back
 * exits down/enters from above.
 *
 * Interruption safety: `animatingRef` gates every navigation/submit handler,
 * so no second transition (or submit) can start while one is in flight — a
 * killed tween can therefore only mean unmount, where the DOM dies with it.
 * The enter timeline's onComplete always re-asserts the resting state
 * (height:auto + clearProps on fields) so nothing can rest hidden.
 *
 * prefers-reduced-motion (checked per interaction, not cached): instant
 * swaps, no height tween, no field motion — today's behavior — but focus
 * still moves to the incoming pane's heading so the step change is announced.
 */
const PANE_EXIT_S = 0.22;
const PANE_EXIT_STAGGER_S = 0.03;
const PANE_EXIT_Y = 12;
const PANE_HEIGHT_S = 0.4;
const PANE_ENTER_S = 0.5;
const PANE_ENTER_STAGGER_S = 0.05;
const PANE_ENTER_Y = 16;
/** Success beat: the whole form body dips out on this short power2.in. */
const SUCCESS_EXIT_S = 0.28;

/** Checked at interaction time (not cached at mount) so an OS-level toggle
 *  mid-session is honored by the very next step change. */
function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

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

/** Shared entrance curve as a Tailwind arbitrary ease — same literal the rest
 *  of the app uses for CSS-side transitions (mirrors --ease-entrance). */
const EASE_ENTRANCE_CLS = "ease-[cubic-bezier(0.16,1,0.3,1)]";

/** Invalid-state treatment for text fields: refusal-toned border plus a soft
 *  outer shadow ring that EASES in — box-shadow is in the transition list so
 *  the ring blooms instead of snapping (the primitives' bare transition-colors
 *  is replaced via twMerge). motion-reduce keeps states instant. */
const INVALID_FIELD_CLS = cn(
  "transition-[color,background-color,border-color,box-shadow] duration-300",
  EASE_ENTRANCE_CLS,
  "motion-reduce:transition-none",
  "aria-invalid:border-[hsl(var(--refusal)/0.65)] aria-invalid:shadow-[0_0_0_3px_hsl(var(--refusal)/0.15)]",
);

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
        "w-full text-left px-4 py-3 rounded-md text-sm backdrop-blur-sm",
        "bg-surface-elev border",
        // box-shadow rides the transition list so the active accent ring
        // BLOOMS in over 300ms (shadow interpolates from its transparent
        // 'none' state) instead of snapping on for one frame.
        "transition-[color,background-color,border-color,box-shadow] duration-300",
        EASE_ENTRANCE_CLS,
        "motion-reduce:transition-none",
        active
          ? "border-[hsl(var(--accent))] text-ink shadow-[0_0_0_1px_hsl(var(--accent)/0.6),0_8px_24px_-14px_hsl(var(--accent)/0.55)]"
          : "border-rule/60 text-ink-mute hover:border-[hsl(var(--accent)/0.5)] hover:text-ink",
      )}
    >
      <span className="inline-flex items-center gap-2">
        <span
          className={cn(
            // The selection dot swells slightly as it lights — transform +
            // color only, eased on the same entrance curve as the ring.
            "inline-block w-1.5 h-1.5 rounded-full transition-[background-color,transform] duration-300",
            EASE_ENTRANCE_CLS,
            "motion-reduce:transition-none",
            active ? "bg-[hsl(var(--accent))] scale-125" : "bg-[hsl(var(--rule)/0.8)]",
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

// Slides down 12px out of the field it belongs to (see the intake-error-in
// keyframes at the bottom of this file) instead of popping in. Color comes
// from --refusal inline: `text-destructive` was never mapped in the @theme
// block, so as a utility it generated no CSS at all.
function ErrorLine({ id, msg }: { id?: string; msg?: string }) {
  if (!msg) return null;
  return (
    <p
      id={id}
      role="alert"
      className="intake-error-in text-[11px] mt-1.5"
      style={{ color: "hsl(var(--refusal))" }}
    >
      {msg}
    </p>
  );
}

// Stable id for a field's inline error message, used by aria-describedby.
const errId = (field: string) => `intake-${field}-error`;

/** Focus intent carried across a pane swap: "heading" lands on the incoming
 *  pane's title; "auto" prefers the first invalid field (failed submit
 *  bouncing the user back to step 3). */
type PaneFocus = "heading" | "auto";

export function MultiStepIntake() {
  const { language } = useLanguage();
  const t = copy(language);

  const [step, setStep] = useState(1);
  const [data, setData] = useState<IntakeData>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // --- choreography plumbing (see the block comment at the top of the file) ---
  const cardRef = useRef<HTMLDivElement | null>(null); // outer card: success height tween + GSAP scope
  const formBodyRef = useRef<HTMLDivElement | null>(null); // whole form body: dips out on success
  const paneShellRef = useRef<HTMLDivElement | null>(null); // height-managed pane container
  const paneHeadingRef = useRef<HTMLHeadingElement | null>(null); // per-step h3, focus target
  const successHeadingRef = useRef<HTMLHeadingElement | null>(null);

  // True from the first exit frame to the enter timeline's onComplete. Every
  // navigation/submit handler early-returns while set, so transitions are
  // never interrupted mid-flight (the dossier stays interruptible-safe by
  // never allowing the interruption).
  const animatingRef = useRef(false);
  // Handshake refs consumed exactly once by the effects below. Set BEFORE the
  // state commit that triggers the effect; `instant` marks the reduced-motion
  // hard-swap path (focus moves, nothing animates).
  const pendingPaneRef = useRef<{ dir: 1 | -1; focus: PaneFocus; instant: boolean } | null>(null);
  const pendingSuccessRef = useRef<{ instant: boolean } | null>(null);
  // The single handler-created tween alive at any time (pane exit OR form
  // dip-out — animatingRef guarantees exclusivity). Enter timelines live in
  // useGSAP contexts and are killed by them; this one needs manual cleanup.
  const handlerTweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    return () => {
      handlerTweenRef.current?.kill();
      handlerTweenRef.current = null;
    };
  }, []);

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

  /**
   * Deferred pane swap. Plays the outgoing fields away, THEN commits the step
   * — the useGSAP effect keyed on `step` picks up the pending handshake and
   * runs the height tween + enter cascade. Stale errors are cleared at COMMIT
   * time (bundled with setStep) so error lines never unmount mid-exit and
   * shift the outgoing fields; the "auto" focus path (failed submit bouncing
   * back to step 3) keeps its just-set errors so they render with the pane.
   */
  function goToStep(next: number, focus: PaneFocus) {
    if (animatingRef.current || next === step || next < 1 || next > TOTAL_STEPS)
      return;
    const shell = paneShellRef.current;
    const dir: 1 | -1 = next > step ? 1 : -1;
    const clearErrs = focus === "heading";
    if (prefersReducedMotion() || !shell) {
      pendingPaneRef.current = { dir, focus, instant: true };
      if (clearErrs) setErrors({});
      setStep(next);
      return;
    }
    animatingRef.current = true;
    pendingPaneRef.current = { dir, focus, instant: false };
    // Freeze the shell at its outgoing height; overflow:hidden both clips the
    // exiting fields and makes the shell a BFC, so the later scrollHeight
    // read measures the incoming pane's true height (child margins contained).
    gsap.set(shell, { height: shell.offsetHeight, overflow: "hidden" });
    handlerTweenRef.current?.kill();
    handlerTweenRef.current = gsap.to(
      shell.querySelectorAll<HTMLElement>("[data-intake-field]"),
      {
        y: -PANE_EXIT_Y * dir, // forward: up and away; back: down and away
        autoAlpha: 0,
        duration: PANE_EXIT_S,
        stagger: PANE_EXIT_STAGGER_S,
        ease: "power2.in",
        onComplete: () => {
          // Commit the swap on a live node count of zero visible fields —
          // React unmounts the outgoing pane; the effect below takes over.
          if (clearErrs) setErrors({});
          setStep(next);
        },
      },
    );
  }

  // ENTER half of the pane swap. useGSAP runs this as a layout effect, i.e.
  // after the incoming pane is committed but BEFORE the browser paints it —
  // the gsap.set below is therefore flash-proof by construction.
  useGSAP(
    () => {
      const pending = pendingPaneRef.current;
      if (!pending) return; // initial mount / unrelated re-render
      pendingPaneRef.current = null;
      const shell = paneShellRef.current;
      if (!shell) {
        animatingRef.current = false;
        return;
      }

      const focusIncoming = () => {
        // preventScroll everywhere: the card is mid-page under Lenis — a
        // browser auto-scroll here would fight the smooth scroller.
        if (pending.focus === "auto") {
          const invalid = shell.querySelector<HTMLElement>('[aria-invalid="true"]');
          if (invalid) {
            invalid.focus({ preventScroll: true });
            return;
          }
        }
        paneHeadingRef.current?.focus({ preventScroll: true });
      };

      if (pending.instant) {
        // Reduced motion: the pane is already at its final state (no inline
        // styles were ever applied). Only the focus move remains.
        focusIncoming();
        return;
      }

      const fields = shell.querySelectorAll<HTMLElement>("[data-intake-field]");
      // Spatial memory: forward enters from below (+y), back from above (-y).
      gsap.set(fields, { y: PANE_ENTER_Y * pending.dir, autoAlpha: 0 });
      const target = shell.scrollHeight;
      const tl = gsap.timeline({
        onComplete: () => {
          // Hand layout back to the document: auto height, clean fields. This
          // re-assert is the resting-state guarantee — whatever happened
          // mid-tween, the pane ends fully visible and unclipped.
          gsap.set(shell, { clearProps: "height,overflow" });
          gsap.set(fields, { clearProps: "transform,opacity,visibility" });
          animatingRef.current = false;
          focusIncoming();
        },
      });
      // Height bridges the two panes (expo.inOut crossing); the field cascade
      // overlaps it slightly so the enter reads as one continuous gesture.
      tl.to(shell, { height: target, duration: PANE_HEIGHT_S, ease: "expo.inOut" }, 0);
      tl.to(
        fields,
        {
          y: 0,
          autoAlpha: 1,
          duration: PANE_ENTER_S,
          stagger: PANE_ENTER_STAGGER_S,
          ease: "expo.out",
        },
        0.08,
      );
    },
    { dependencies: [step], scope: cardRef },
  );

  function handleNext() {
    if (animatingRef.current || submitting) return;
    if (validate(step)) goToStep(step + 1, "heading");
  }

  function handleBack() {
    if (animatingRef.current || submitting) return;
    goToStep(step - 1, "heading");
  }

  async function handleSubmit() {
    if (animatingRef.current || submitting) return;
    if (!validate(3)) {
      // Bounce back to the pane that owns the failure; "auto" focus lands on
      // the first aria-invalid field once the pane has entered.
      goToStep(3, "auto");
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
      // Success beat, same deferred-commit pattern as the pane swap: dip the
      // whole form body out first, THEN commit `submitted` — the effect below
      // draws the check and cascades the confirmation copy in. (Back/Next are
      // gated on `submitting`, so no pane transition can be in flight here.)
      const card = cardRef.current;
      const body = formBodyRef.current;
      if (prefersReducedMotion() || !card || !body) {
        pendingSuccessRef.current = { instant: true };
        setSubmitted(true);
      } else {
        animatingRef.current = true;
        pendingSuccessRef.current = { instant: false };
        // Freeze the card so the confirmation's (shorter) height eases in
        // rather than snapping the page below upward.
        gsap.set(card, { height: card.offsetHeight, overflow: "hidden" });
        handlerTweenRef.current?.kill();
        handlerTweenRef.current = gsap.to(body, {
          y: -10,
          autoAlpha: 0,
          duration: SUCCESS_EXIT_S,
          ease: "power2.in",
          onComplete: () => setSubmitted(true),
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ENTER half of the success beat: drawn check (stroke-dashoffset) + copy
  // cascade. Layout-effect timing again — strokes and copy are parked hidden
  // before the confirmation can ever paint.
  useGSAP(
    () => {
      if (!submitted) return;
      const pending = pendingSuccessRef.current;
      pendingSuccessRef.current = null;
      const card = cardRef.current;
      const heading = successHeadingRef.current;

      if (!pending || pending.instant || !card) {
        // Reduced motion (or degenerate mount): instant confirmation, exactly
        // the old hard swap. Re-assert natural height in case a lock survived
        // and move focus so the swap is announced to screen readers.
        if (card) gsap.set(card, { clearProps: "height,overflow" });
        animatingRef.current = false;
        heading?.focus({ preventScroll: true });
        return;
      }

      const ring = card.querySelector<SVGElement>("[data-success-ring]");
      const check = card.querySelector<SVGElement>("[data-success-check]");
      const strokes = [ring, check].filter((el): el is SVGElement => el !== null);
      const items = card.querySelectorAll<HTMLElement>("[data-success-item]");
      // pathLength=1 normalizes both strokes. The hidden state uses a dash
      // pattern slightly LONGER than the path with the offset parked past the
      // far end, so no dash boundary (and no round-cap dot artifact) ever
      // sits inside the visible range while hidden.
      gsap.set(strokes, { strokeDasharray: "1 1.1", strokeDashoffset: 1.05 });
      gsap.set(items, { autoAlpha: 0, y: 12 });
      // scrollHeight excludes the card's own border; height is border-box
      // here (preflight), so add the border delta (offset − client) or the
      // hand-back to height:auto would land 2px off.
      const target = card.scrollHeight + (card.offsetHeight - card.clientHeight);
      const tl = gsap.timeline({
        onComplete: () => {
          // Resting-state guarantee: clean strokes, clean copy, auto height.
          gsap.set(card, { clearProps: "height,overflow" });
          gsap.set(items, { clearProps: "transform,opacity,visibility" });
          gsap.set(strokes, { clearProps: "strokeDasharray,strokeDashoffset" });
          animatingRef.current = false;
          heading?.focus({ preventScroll: true });
        },
      });
      tl.to(card, { height: target, duration: PANE_HEIGHT_S, ease: "expo.inOut" }, 0);
      if (ring)
        tl.to(ring, { strokeDashoffset: 0, duration: 0.6, ease: "expo.out" }, 0.08);
      if (check)
        tl.to(check, { strokeDashoffset: 0, duration: 0.5, ease: "expo.out" }, 0.22);
      tl.to(
        items,
        { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.06, ease: "expo.out" },
        0.18,
      );
    },
    { dependencies: [submitted], scope: cardRef },
  );

  return (
    <>
      {/* ONE persistent card across form ↔ success — the border/background
          never remounts, so the success beat can tween the card's height while
          its contents swap. Padding lives on the inner wrappers for the same
          reason (scrollHeight measures content directly). */}
      <div ref={cardRef} className="bg-surface-elev border border-rule/40 rounded-xl">
        {submitted ? (
          <div className="p-8 sm:p-10 text-center">
            {/* Drawn confirmation mark. Fully drawn by default (no dash attrs
                in markup) so the reduced-motion / instant path needs no setup;
                the animated path parks the strokes hidden pre-paint. Colors
                via style: CSS var() is unreliable in SVG presentation attrs. */}
            <svg
              viewBox="0 0 48 48"
              fill="none"
              aria-hidden="true"
              className="mx-auto mb-6 h-12 w-12"
            >
              <circle
                data-success-ring
                cx="24"
                cy="24"
                r="22.5"
                strokeWidth="1"
                pathLength={1}
                style={{ stroke: "hsl(var(--accent) / 0.35)" }}
              />
              <path
                data-success-check
                d="M15.5 24.5l6 6L32.5 19"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                style={{ stroke: "hsl(var(--accent))" }}
              />
            </svg>
            <p
              data-success-item
              className="text-[10px] font-mono uppercase tracking-[0.18em] mb-3"
              style={{ color: "hsl(var(--accent))" }}
            >
              {t.successEyebrow}
            </p>
            <h3
              data-success-item
              ref={successHeadingRef}
              tabIndex={-1}
              className="heading-3 mb-3 outline-none"
            >
              {t.successTitle}
            </h3>
            <p
              data-success-item
              className="text-sm text-ink-mute leading-[1.6] max-w-md mx-auto"
            >
              {t.successBody}
            </p>
          </div>
        ) : (
          <div ref={formBodyRef} className="p-6 sm:p-8">
            {/* Progress + step counter */}
            <div className="mb-8 flex items-center justify-between gap-4">
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-mute">
                {t.eyebrow}
              </p>
              <div className="flex items-center gap-4">
                {/* Dots joined by 1px hairlines that DRAW left→right (scaleX,
                    origin left) as steps complete — the site's shared
                    progress grammar. Going Back retracts them the same way.
                    Purely decorative; the mono counter beside it is the
                    readable state. */}
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
                    const n = i + 1;
                    const state =
                      n < step ? "done" : n === step ? "active" : "future";
                    return (
                      <Fragment key={n}>
                        {n > 1 && (
                          <span className="relative block h-px w-4 overflow-hidden rounded-full bg-[hsl(var(--rule))]">
                            <span
                              className={cn(
                                "absolute inset-0 origin-left bg-[hsl(var(--accent)/0.6)]",
                                "transition-transform duration-500",
                                EASE_ENTRANCE_CLS,
                                "motion-reduce:transition-none",
                              )}
                              style={{
                                transform: step >= n ? "scaleX(1)" : "scaleX(0)",
                              }}
                            />
                          </span>
                        )}
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            "transition-[background-color,box-shadow,transform] duration-300",
                            EASE_ENTRANCE_CLS,
                            "motion-reduce:transition-none",
                            state === "active" &&
                              "bg-[hsl(var(--accent))] scale-125 shadow-[0_0_8px_hsl(var(--accent)/0.55)]",
                            state === "done" && "bg-[hsl(var(--accent)/0.55)]",
                            state === "future" && "bg-[hsl(var(--rule))]",
                          )}
                        />
                      </Fragment>
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

            {/* Height-managed pane shell. Everything inside marked
                [data-intake-field] takes part in the exit/enter cascade —
                including the step title, so the whole pane travels as one
                dossier page. Nav + footer live OUTSIDE and never move. */}
            <div ref={paneShellRef}>
              <h3
                ref={paneHeadingRef}
                tabIndex={-1}
                data-intake-field
                className="heading-3 mb-6 outline-none"
              >
                {t.titles[step - 1]}
              </h3>

              {/* Step 1 */}
              {step === 1 && (
                <div className="space-y-6">
                  <div data-intake-field>
                    <FieldLabel>{t.workQuestion}</FieldLabel>
                    <div
                      role="radiogroup"
                      aria-label={t.workQuestion}
                      aria-invalid={errors.workType ? true : undefined}
                      aria-describedby={
                        errors.workType ? errId("workType") : undefined
                      }
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

                  <div data-intake-field>
                    <FieldLabel>{t.outcomeLabel}</FieldLabel>
                    <Textarea
                      ref={setFieldRef("outcome")}
                      value={data.outcome}
                      onChange={(e) => update("outcome", e.target.value)}
                      placeholder={t.outcomePlaceholder}
                      rows={5}
                      aria-invalid={errors.outcome ? true : undefined}
                      aria-describedby={
                        errors.outcome ? errId("outcome") : undefined
                      }
                      className={INVALID_FIELD_CLS}
                    />
                    <ErrorLine id={errId("outcome")} msg={errors.outcome} />
                  </div>
                </div>
              )}

              {/* Step 2 */}
              {step === 2 && (
                <div className="space-y-6">
                  <div data-intake-field>
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

                  <div data-intake-field>
                    <FieldLabel>{t.budgetQuestion}</FieldLabel>
                    <div
                      role="radiogroup"
                      aria-label={t.budgetQuestion}
                      aria-invalid={errors.budget ? true : undefined}
                      aria-describedby={
                        errors.budget ? errId("budget") : undefined
                      }
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
                  <div data-intake-field className="grid sm:grid-cols-2 gap-4">
                    <label className="block">
                      <FieldLabel>{t.name}</FieldLabel>
                      <Input
                        ref={setFieldRef("name")}
                        type="text"
                        value={data.name}
                        onChange={(e) => update("name", e.target.value)}
                        placeholder={t.namePh}
                        autoComplete="name"
                        autoCapitalize="words"
                        required
                        aria-invalid={errors.name ? true : undefined}
                        aria-describedby={errors.name ? errId("name") : undefined}
                        className={INVALID_FIELD_CLS}
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
                        inputMode="email"
                        autoComplete="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        required
                        aria-invalid={errors.email ? true : undefined}
                        aria-describedby={
                          errors.email ? errId("email") : undefined
                        }
                        className={INVALID_FIELD_CLS}
                      />
                      <ErrorLine id={errId("email")} msg={errors.email} />
                    </label>
                  </div>
                  <label data-intake-field className="block">
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
                      aria-describedby={
                        errors.company ? errId("company") : undefined
                      }
                      className={INVALID_FIELD_CLS}
                    />
                    <ErrorLine id={errId("company")} msg={errors.company} />
                  </label>
                  <p data-intake-field className="text-[11px] text-ink-mute">
                    {t.requiredHint}
                  </p>
                </div>
              )}

              {/* Step 4 — review. Each row is its own cascade unit so the
                  summary compiles line by line, dossier-style.

                  The rows stack below `sm`: the old fixed `10rem` label
                  column left ~59px for the value at 375px, and since a grid
                  `1fr` track has `min-width: auto`, one real email address
                  pushed the whole grid — and the page — wider than the
                  viewport (MOBILE_AUDIT D-4). `min-w-0` + `break-words` on
                  the value keep it contained at every width. */}
              {step === 4 && (
                <div className="space-y-4">
                  <p data-intake-field className="text-sm text-ink-mute mb-2">
                    {t.review}
                  </p>
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
                        data-intake-field
                        className="px-4 py-3 grid grid-cols-1 gap-1 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-3 sm:items-baseline"
                      >
                        <dt className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-mute">
                          {row.label}
                        </dt>
                        <dd className="min-w-0 break-words text-sm text-ink leading-[1.5] whitespace-pre-wrap">
                          {row.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>

            {/* Nav — outside the pane shell so Back/Next hold still (and hold
                focus) while panes travel. Clicks during a transition are
                swallowed by the animatingRef gate, not by disabling — the
                buttons never flicker their disabled style mid-swap. */}
            <div className="mt-8 flex items-center justify-between gap-4">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                disabled={step === 1 || submitting}
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
                  {submitting
                    ? language === "en"
                      ? "Sending…"
                      : "Invio…"
                    : t.send}
                  {!submitting && <Check className="w-4 h-4" />}
                </Button>
              )}
            </div>

            {submitError && (
              <div
                role="alert"
                className="intake-error-in mt-4 text-center text-sm"
                style={{ color: "hsl(var(--refusal))" }}
              >
                <p>
                  {language === "en"
                    ? `We couldn't send that. Mind retrying, or email ${CONTACT_EMAIL} directly?`
                    : `Non siamo riusciti a inviare. Riprova, o scrivi direttamente a ${CONTACT_EMAIL}.`}
                </p>
                <p className="mt-1 text-[11px] text-ink-mute font-mono">
                  {submitError}
                </p>
              </div>
            )}

            <p className="mt-6 text-[10px] font-mono uppercase tracking-[0.14em] text-ink-mute text-center">
              {t.footer}
            </p>
          </div>
        )}
      </div>
      {/* Validation feedback: the message slides 12px down out of the field it
          belongs to on the entrance curve — no pop. `both` holds the final
          state if the animation is interrupted by a re-render, so a message
          can never rest invisible. Reduced motion: appears statically. */}
      <style>{`
        @keyframes intake-error-in {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .intake-error-in {
          animation: intake-error-in 0.3s var(--ease-entrance) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .intake-error-in { animation: none; }
        }
      `}</style>
    </>
  );
}
