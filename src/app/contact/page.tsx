import type { Metadata } from "next";
import { ContactClient } from "./contact-client";

export const metadata: Metadata = {
  title: "Contact. Book a Scoping Call",
  description:
    "Book a scoping call with Sersan. London-registered AI-powered software consultancy serving fintech, SaaS, and regulated tech operators. One-business-day reply.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return <ContactClient />;
}
