import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { CaseStudiesClient } from "./case-studies-client";

export const metadata: Metadata = pageMetadata({
  title: "Selected Work — Builds & Prior Senior Delivery",
  description:
    "Selected SerSan builds and prior senior delivery, each labelled by who delivered it and under what badge. Custom software, automation and AI in production.",
  path: "/case-studies",
});

export default function CaseStudiesPage() {
  return <CaseStudiesClient />;
}
