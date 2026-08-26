import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import ServiceDetail from "@/components/sections/service-detail";
import { getService } from "@/data/services";

const service = getService("engineering")!;

export const metadata: Metadata = pageMetadata({
  title: "Custom Software, Internal Tools & AI Products",
  description:
    "Custom software built around how your business actually works: internal tools, portals, platforms and AI products. No in-house engineering team required.",
  path: `/services/${service.slug}`,
});

export default function EngineeringServicePage() {
  return <ServiceDetail service={service} />;
}
