import type { Metadata } from "next";
import ServiceDetail from "@/components/sections/service-detail";
import { getService } from "@/data/services";

const service = getService("automation")!;

export const metadata: Metadata = {
  title: `${service.name} — ${service.positioning}`,
  description: service.description,
  alternates: { canonical: `/services/${service.slug}` },
  robots: { index: true, follow: true },
};

export default function AutomationServicePage() {
  return <ServiceDetail service={service} />;
}
