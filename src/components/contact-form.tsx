"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/components/language-provider";
import { CONTACT_EMAIL } from "@/lib/site";
import { track, trackOnce, EVENTS } from "@/lib/analytics";

interface ContactFormState {
  name: string;
  email: string;
  company: string;
  message: string;
}

const initialState: ContactFormState = {
  name: "",
  email: "",
  company: "",
  message: "",
};

export function ContactForm() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [data, setData] = useState<ContactFormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  // Native `required` validation reports one `invalid` event per field, so the
  // names are collected and flushed as ONE lead_form_error on the next tick.
  const invalidFieldsRef = useRef<string[]>([]);
  const invalidFlushRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Funnel denominator (PROMPT 17) + timer cleanup. The observer disconnects
   *  on its first hit and on unmount; `trackOnce` absorbs StrictMode's
   *  double-invoke in development. Nothing is attached to scroll. */
  useEffect(() => {
    const el = formRef.current;
    let obs: IntersectionObserver | null = null;
    if (el && typeof IntersectionObserver !== "undefined") {
      obs = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          trackOnce(EVENTS.LEAD_FORM_VIEWED, { form: "contact" }, "contact");
          obs?.disconnect();
        },
        { threshold: 0.2 },
      );
      obs.observe(el);
    }
    return () => {
      obs?.disconnect();
      if (invalidFlushRef.current) clearTimeout(invalidFlushRef.current);
    };
  }, []);

  /** Field NAMES only — never what was typed into them. */
  function noteInvalidField(e: React.FormEvent<HTMLFormElement>) {
    const name = (e.target as HTMLInputElement | null)?.name;
    if (!name) return;
    if (!invalidFieldsRef.current.includes(name)) {
      invalidFieldsRef.current.push(name);
    }
    if (invalidFlushRef.current) return;
    invalidFlushRef.current = setTimeout(() => {
      invalidFlushRef.current = null;
      const fields = invalidFieldsRef.current.join(",");
      invalidFieldsRef.current = [];
      if (fields) track(EVENTS.LEAD_FORM_ERROR, { form: "contact", fields });
    }, 0);
  }

  function handleChange<K extends keyof ContactFormState>(key: K, value: ContactFormState[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, language }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        const msg =
          json && typeof json.error === "string" ? json.error : "Request failed";
        throw new Error(msg);
      }
      // The conversion — only after the server accepted it.
      track(EVENTS.LEAD_FORM_SUBMITTED, { form: "contact", lang: language });
      setSubmitted(true);
    } catch {
      setSubmitError(
        isEn
          ? `We couldn't send that. Mind retrying, or email ${CONTACT_EMAIL} directly?`
          : `Non siamo riusciti a inviare. Riprovate, o scriveteci direttamente a ${CONTACT_EMAIL}.`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-rule/70 bg-surface/40 p-8 text-center">
        <p className="text-[10px] font-mono uppercase tracking-[0.18em] mb-3 text-[hsl(var(--accent))]">
          {isEn ? "Received" : "Ricevuto"}
        </p>
        <h3 className="font-display text-2xl text-ink mb-3 leading-tight">
          {isEn
            ? "Thanks. We'll reply within 1 business day."
            : "Grazie. Vi rispondiamo entro 1 giorno lavorativo."}
        </h3>
        <p className="text-sm text-ink-mute leading-[1.55]">
          {isEn ? (
            <>
              A founder reads every message. If it&apos;s urgent, email{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                onClick={() =>
                  track(EVENTS.CTA_EMAIL, { source_section: "contact_form_sent" })
                }
                className="underline decoration-dotted underline-offset-4"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </>
          ) : (
            <>
              Ogni messaggio viene letto da un founder. Se è urgente, scrivete a{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                onClick={() =>
                  track(EVENTS.CTA_EMAIL, { source_section: "contact_form_sent" })
                }
                className="underline decoration-dotted underline-offset-4"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      // Cheapest correct place for "they started filling it in": focus
      // bubbles here from every control, and `trackOnce` keeps it to one.
      onFocusCapture={() =>
        trackOnce(EVENTS.LEAD_FORM_STARTED, { form: "contact" }, "contact")
      }
      // `invalid` does not bubble, so this listens in the capture phase.
      onInvalidCapture={noteInvalidField}
      className="space-y-5"
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-mute mb-1.5 block">
            {isEn ? "Name" : "Nome"}
          </span>
          <Input
            type="text"
            name="name"
            autoComplete="name"
            autoCapitalize="words"
            value={data.name}
            onChange={(e) => handleChange("name", e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-mute mb-1.5 block">
            Email
          </span>
          <Input
            type="email"
            name="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={data.email}
            onChange={(e) => handleChange("email", e.target.value)}
            required
          />
        </label>
      </div>

      <label className="block">
        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-mute mb-1.5 block">
          {isEn ? "Company (optional)" : "Azienda (facoltativo)"}
        </span>
        <Input
          type="text"
          name="company"
          autoComplete="organization"
          value={data.company}
          onChange={(e) => handleChange("company", e.target.value)}
        />
      </label>

      <label className="block">
        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-mute mb-1.5 block">
          {isEn
            ? "What are you trying to build, automate, or fix?"
            : "Cosa volete costruire, automatizzare o sistemare?"}
        </span>
        <Textarea
          name="message"
          autoComplete="off"
          value={data.message}
          onChange={(e) => handleChange("message", e.target.value)}
          rows={6}
          required
        />
      </label>

      {submitError && (
        <p role="alert" className="text-sm text-[hsl(var(--refusal))]">
          {submitError}
        </p>
      )}

      <div className="pt-2 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-xs text-ink-mute">
          {isEn
            ? "Two or three sentences is enough. Read by a founder."
            : "Bastano due o tre frasi. Lo legge un founder."}
        </p>
        <Button type="submit" variant="hero" size="lg" disabled={submitting} className="gap-2">
          {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          {submitting
            ? isEn
              ? "Sending…"
              : "Invio…"
            : isEn
              ? "Send"
              : "Invia"}
        </Button>
      </div>
    </form>
  );
}
