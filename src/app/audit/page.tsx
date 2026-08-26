import type { Metadata } from "next";
import { AuditClient } from "./audit-client";

export const metadata: Metadata = {
  title: "Technical Audit. Know What to Build Next",
  description:
    "A paid diagnostic in 2–6 business days, fixed scope. A senior engineer looks at your systems, workflows, data and where software, automation or AI would actually pay off. You leave with a written report and a recommended next step — no obligation to continue.",
  alternates: { canonical: "/audit" },
};

export default function AuditPage() {
  return <AuditClient />;
}
