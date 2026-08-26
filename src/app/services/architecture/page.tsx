import type { Metadata } from "next";
import ServiceDetail from "@/components/sections/service-detail";
import { FACTS } from "@/data/copy";
import { getService } from "@/data/services";

const service = getService("architecture")!;

export const metadata: Metadata = {
  // Distinct search intent per service — the four pages used to share one
  // template title and compete with each other.
  title: "Technical Audit & Software Architecture",
  description:
    `A senior technical audit in ${FACTS.auditDuration.en}: what to build, what to buy, what to leave alone. Software architecture and AI opportunity assessment, with a written recommendation you can act on.`,
  alternates: { canonical: `/services/${service.slug}` },
  robots: { index: true, follow: true },
};

export default function ArchitectureServicePage() {
  return <ServiceDetail service={service} />;
}
