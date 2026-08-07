import type { Metadata } from "next";
import { StartClient } from "./start-client";

export const metadata: Metadata = {
  title: "Start with a technical scoping call",
  description:
    "Tell us what you're trying to build, automate, or harden. We'll review the context and reply within one business day with a recommended next step.",
  alternates: { canonical: "/start" },
  robots: { index: true, follow: true },
};

/**
 * /start — the technical intake page.
 *
 * Replaces the old `mailto:` primary CTA across the site. Thin server
 * component (metadata + crisp initial paint); the full page body lives in
 * StartClient so the copy can follow the EN/IT toggle (repo pattern:
 * page.tsx + *-client.tsx, as on /audit, /contact, /consulting). The form
 * inside (StartIntakeForm) owns the multi-field controlled state + submit
 * state machine.
 */
export default function StartPage() {
  return <StartClient />;
}
