import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { PrivacyClient } from "./privacy-client";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "How SERSAN collects, uses, and protects your personal data. GDPR-compliant privacy practices.",
  path: "/privacy",
  index: false,
});

export default function PrivacyPage() {
  return <PrivacyClient />;
}
