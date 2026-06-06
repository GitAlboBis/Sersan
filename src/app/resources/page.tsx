import type { Metadata } from "next";
import { ResourcesClient } from "./resources-client";

export const metadata: Metadata = {
  title: "Writing. AI Consulting Frameworks and Field Notes",
  description:
    "Frameworks, audit pillars, four-layer engagement model, and field notes from senior AI engineering work in fintech, tech, and SaaS.",
  alternates: { canonical: "/resources" },
};

export default function ResourcesPage() {
  return <ResourcesClient />;
}
