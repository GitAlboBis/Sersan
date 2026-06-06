import type { Metadata } from "next";
import { FaqClient } from "./faq-client";

export const metadata: Metadata = {
  title: "FAQ. AI Consulting Engagements",
  description:
    "Frequently asked questions about Sersan's audits, custom builds, agentic systems, fractional AI leadership, and governance engagements.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return <FaqClient />;
}
