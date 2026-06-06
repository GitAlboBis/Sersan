import type { Metadata } from "next";
import { PrivacyClient } from "./privacy-client";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How SERSAN collects, uses, and protects your personal data. GDPR-compliant privacy practices.",
  alternates: { canonical: "/privacy" },
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return <PrivacyClient />;
}
