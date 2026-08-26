import type { Metadata } from "next";
import { CaseStudiesClient } from "./case-studies-client";

export const metadata: Metadata = {
  title: "Selected Work — Builds & Prior Senior Delivery",
  /* Never an aggregate that blends the two: the SerSan builds are the
     invitation, the tier-1 record is the depth behind it. */
  description:
    "Selected SerSan work and prior senior delivery experience. Custom software, automation and AI — from a real-estate agency platform to a trading-education product — plus prior tier-1 delivery by Michele Sanna at Revolut, J.P. Morgan, Deloitte and Accenture.",
  alternates: { canonical: "/case-studies" },
};

export default function CaseStudiesPage() {
  return <CaseStudiesClient />;
}
