import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { AboutClient } from "./about-client";

export const metadata: Metadata = pageMetadata({
  title: "About. Founder-Led, Technically Owned",
  description:
    "Founder-led, technically owned. Alessandro Serratt on the commercial side, Michele Sanna (PhD, LSE) on the technical, with named ownership on every project.",
  path: "/about",
});

export default function AboutPage() {
  return <AboutClient />;
}
