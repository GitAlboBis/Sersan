import type { Metadata } from "next";
import { TrustClient } from "./trust-client";

export const metadata: Metadata = {
  title: "Trust & Security. ISO 27001, DORA, EU AI Act Posture",
  description:
    "Sersan operates with an ISO 27001 (in progress) information security framework and is aligned with DORA, the EU AI Act, and GDPR. London Co. No. 16878386.",
  alternates: { canonical: "/trust" },
};

export default function TrustPage() {
  return <TrustClient />;
}
