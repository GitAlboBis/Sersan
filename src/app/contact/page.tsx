import type { Metadata } from "next";
import { ContactClient } from "./contact-client";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Talk to the people who'll build it. SerSan is a founder-led studio building custom software, automation and AI for founders, SMEs and growing teams. Reply within one business day.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return <ContactClient />;
}
