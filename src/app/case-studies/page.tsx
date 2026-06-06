import type { Metadata } from "next";
import { CaseStudiesClient } from "./case-studies-client";

export const metadata: Metadata = {
  title: "Selected Work. AI-Powered Software Track Record",
  description:
    "AI-powered software shipped to production. Our CPTO Michele Sanna's prior systems at Revolut, JPMorgan, Deloitte, Brevan Howard, and Accenture, plus the AI-native products Sersan is currently building.",
  alternates: { canonical: "/case-studies" },
};

export default function CaseStudiesPage() {
  return <CaseStudiesClient />;
}
