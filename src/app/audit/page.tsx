import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { AuditClient } from "./audit-client";

export const metadata: Metadata = pageMetadata({
  title: "Technical Audit. Know What to Build Next",
  description:
    "A paid diagnostic in 2–6 business days, fixed scope. You leave with a written report on what to build, fix or automate next, and no obligation to continue.",
  path: "/audit",
});

export default function AuditPage() {
  return <AuditClient />;
}
