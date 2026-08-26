import type { Metadata } from "next";
import { StartClient } from "./start-client";

export const metadata: Metadata = {
  title: "Send a project brief",
  description:
    "Tell us what's slowing you down — one workflow, one product idea, one system that needs fixing. Two or three sentences is enough. Reply within one business day.",
  alternates: { canonical: "/start" },
  robots: { index: true, follow: true },
};

/**
 * /start — the project-brief intake page.
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
