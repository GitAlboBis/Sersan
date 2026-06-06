import type { Metadata } from "next";
import { AuditClient } from "./audit-client";

export const metadata: Metadata = {
  title: "Technical Audit. One Week Inside Your Stack",
  description:
    "A paid one-week engagement. Senior engineers inside your stack looking at the product, the systems, the data, and where AI could actually power what you ship. Written report at the end. Fixed scope.",
  alternates: { canonical: "/audit" },
};

export default function AuditPage() {
  return <AuditClient />;
}
