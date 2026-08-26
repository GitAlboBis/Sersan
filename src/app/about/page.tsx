import type { Metadata } from "next";
import { AboutClient } from "./about-client";

export const metadata: Metadata = {
  title: "About. Founder-Led, Technically Owned",
  description:
    "Sersan was founded by two people with opposite backgrounds: Alessandro Serratt (commercial — scoping, structure, client communication) and Michele Sanna (CPTO; PhD Applied Mathematics, LSE; prior senior delivery at Revolut, JPMorgan, Deloitte), with software engineer Mattia Scattu. Every project has a named commercial owner and a named technical owner. London-registered.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return <AboutClient />;
}
