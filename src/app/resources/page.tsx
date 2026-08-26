import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { ResourcesClient } from "./resources-client";

export const metadata: Metadata = pageMetadata({
  title: "Writing. Field Notes on Software, Automation and AI",
  description:
    "Field notes from real builds — what worked, what failed and why. Written for founders and operators running the business, not only for engineers.",
  path: "/resources",
});

export default function ResourcesPage() {
  return <ResourcesClient />;
}
