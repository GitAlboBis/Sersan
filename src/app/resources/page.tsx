import type { Metadata } from "next";
import { ResourcesClient } from "./resources-client";

export const metadata: Metadata = {
  title: "Writing. Field Notes on Software, Automation and AI",
  description:
    "Field notes from real builds — what worked, what failed and why. Written for founders and operators running the business, not only for engineers.",
  alternates: { canonical: "/resources" },
};

export default function ResourcesPage() {
  return <ResourcesClient />;
}
