import type { Metadata } from "next";
import { TrustClient } from "./trust-client";

export const metadata: Metadata = {
  title: "Trust & Security. Ownership, Data Handling, Compliance Posture",
  description:
    "You own the code and the data. Controls scaled to the system we build, designed to support applicable GDPR, DORA and EU AI Act requirements. London Co. No. 16878386.",
  alternates: { canonical: "/trust" },
};

export default function TrustPage() {
  return <TrustClient />;
}
