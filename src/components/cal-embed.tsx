"use client";

// While CAL_ENABLED is false we render a written-brief / email fallback card
// and DO NOT load the Cal.com script or hit app.cal.com (the placeholder slug
// `sersan/scoping-call` 404s — "Cal Link seems to be wrong"). To restore the
// live embed: set CAL_ENABLED = true in `@/lib/site` and replace the slug
// default below with the real Cal.com booking link.
import dynamic from "next/dynamic";
import Link from "next/link";
import { Mail, ArrowRight } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { CAL_ENABLED, CONTACT_EMAIL, START_HREF } from "@/lib/site";
import { track, EVENTS } from "@/lib/analytics";
import { CTA, pick } from "@/data/copy";

interface CalEmbedProps {
  slug?: string;
  theme?: "dark" | "light" | "auto";
  hideEventTypeDetails?: boolean;
}

// The live Cal embed is isolated in its own module and lazy-loaded ONLY when
// CAL_ENABLED is true, so `@calcom/embed-react` (and its getCalApi script
// injection) is never imported/executed in the disabled path.
const CalLiveEmbed = dynamic(
  () => import("./cal-live-embed").then((m) => m.CalLiveEmbed),
  { ssr: false },
);

/** Written-brief / email card. Booking is disabled site-wide (CAL_ENABLED),
 *  so this promises nothing that cannot be delivered: a written brief, read
 *  by a founder, answered within one business day. Copy is inline (the repo's
 *  isEn convention) rather than pulled from the dead translations dictionary,
 *  whose `cal.fallback.*` keys still announced a booking flow. */
function CalFallbackCard() {
  const { language } = useLanguage();
  const isEn = language === "en";

  return (
    <div className="cal-embed-wrap relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-2 -top-2 -bottom-2 rounded-2xl"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, hsl(var(--accent) / 0.06), transparent 70%)",
        }}
      />
      <div className="card-steel relative rounded-xl p-7 sm:p-9 text-center">
        <p className="eyebrow mb-4" style={{ color: "hsl(var(--accent))" }}>
          {isEn ? "Start in writing" : "Iniziate per iscritto"}
        </p>
        <h3 className="font-display text-2xl sm:text-[1.75rem] text-ink leading-[1.18] tracking-tight mb-4 text-balance">
          {isEn
            ? "Tell us what you're trying to solve."
            : "Raccontateci cosa volete risolvere."}
        </h3>
        <p className="mx-auto max-w-md text-base text-ink-mute leading-[1.6] mb-7">
          {isEn
            ? "Two or three sentences is enough — one workflow, one product idea, one system that needs fixing. A founder reads it and replies within one business day."
            : "Bastano due o tre frasi: un processo, un'idea di prodotto, un sistema da sistemare. Lo legge un founder e vi risponde entro un giorno lavorativo."}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link
            href={START_HREF}
            // This card stands where the booking embed would be, so its
            // conversions have to be readable separately from the page's own
            // CTAs (PROMPT 17).
            onClick={() =>
              track(EVENTS.CTA_PROJECT_BRIEF, {
                source_section: "cal_fallback",
                lang: language,
              })
            }
            className="group inline-flex items-center justify-center gap-1.5 rounded-md px-5 py-2.5 text-sm font-medium bg-accent text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"
          >
            {pick(isEn, CTA.primary)}
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            onClick={() =>
              track(EVENTS.CTA_EMAIL, { source_section: "cal_fallback" })
            }
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-rule/70 px-5 py-2.5 text-sm text-ink-mute hover:text-ink hover:border-[hsl(var(--accent)/0.42)] transition-colors"
          >
            <Mail className="h-3.5 w-3.5" />
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>
    </div>
  );
}

export function CalEmbed(props: CalEmbedProps) {
  if (!CAL_ENABLED) {
    return <CalFallbackCard />;
  }
  return <CalLiveEmbed {...props} />;
}
