import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import ServiceDetail from "@/components/sections/service-detail";
import { FACTS } from "@/data/copy";
import { getService } from "@/data/services";

const service = getService("architecture")!;

export const metadata: Metadata = pageMetadata({
  title: "Technical Audit & Software Architecture",
  description:
    `A senior technical audit in ${FACTS.auditDuration.en}: what to build, what to buy, what to leave alone. Software architecture and AI opportunity assessment, with a written recommendation you can act on.`,
  path: `/services/${service.slug}`,
});

export default function ArchitectureServicePage() {
  return <ServiceDetail service={service} />;
}
