import type { Metadata } from "next";
import ServiceDetail from "@/components/sections/service-detail";
import { getService } from "@/data/services";

const service = getService("engineering")!;

export const metadata: Metadata = {
  // Distinct search intent per service — the four pages used to share one
  // template title and compete with each other.
  title: "Custom Software, Internal Tools & AI Products",
  description:
    "Custom software built around how your business works: internal tools, management systems, customer portals, web apps, APIs and AI-powered products. No internal engineering team required.",
  alternates: { canonical: `/services/${service.slug}` },
  robots: { index: true, follow: true },
};

export default function EngineeringServicePage() {
  return <ServiceDetail service={service} />;
}
