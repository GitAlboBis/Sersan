"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/components/language-provider";
import { CONTACT_EMAIL } from "@/lib/site";

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
      setSubmitted(true);
    } catch {
      setSubmitError(
        isEn
          ? `We couldn't send that. Mind retrying, or email ${CONTACT_EMAIL} directly?`
          : `Non siamo riusciti a inviare. Riprova, o scrivi direttamente a ${CONTACT_EMAIL}.`,
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
              A senior engineer reads every inbound. If it&apos;s urgent, email{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline decoration-dotted underline-offset-4">
                {CONTACT_EMAIL}
              </a>
              .
            </>
          ) : (
            <>
              Ogni messaggio viene letto da un ingegnere senior. Se è urgente, scrivete a{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline decoration-dotted underline-offset-4">
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
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-mute mb-1.5 block">
            {isEn ? "Name" : "Nome"}
          </span>
          <Input
            type="text"
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
            value={data.email}
            onChange={(e) => handleChange("email", e.target.value)}
            required
          />
        </label>
      </div>

      <label className="block">
        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-mute mb-1.5 block">
          {isEn ? "Company" : "Azienda"}
        </span>
        <Input
          type="text"
          value={data.company}
          onChange={(e) => handleChange("company", e.target.value)}
        />
      </label>

      <label className="block">
        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-mute mb-1.5 block">
          {isEn
            ? "What's broken, what's manual, what you want to ship"
            : "Cosa non funziona, cosa è manuale, cosa volete portare in produzione"}
        </span>
        <Textarea
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
            ? "A senior engineer reads it. One business day."
            : "Lo legge un ingegnere senior. Un giorno lavorativo."}
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
