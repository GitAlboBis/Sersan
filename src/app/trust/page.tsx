import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { TrustClient } from "./trust-client";

export const metadata: Metadata = pageMetadata({
  title: "Trust & Security. Ownership and Compliance Posture",
  description:
    "You own the code and the data. Controls scaled to the system we build, designed to support applicable GDPR, DORA and EU AI Act requirements.",
  path: "/trust",
});

export default function TrustPage() {
  return <TrustClient />;
}
