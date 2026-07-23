import type { Metadata } from "next";
import { AboutClient } from "./about-client";

export const metadata: Metadata = {
  title: "About. Senior AI Engineers Who Build and Operate",
  description:
    "Sersan was founded by two operators with opposite backgrounds: Alessandro Serratt (commercial, CAIC, dual master's) and Michele Sanna (PhD Applied Mathematics, LSE; ex-Revolut, JPMorgan, Deloitte), joined by software engineer Mattia Scattu. London-registered.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return <AboutClient />;
}
