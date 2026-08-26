import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import ServiceDetail from "@/components/sections/service-detail";
import { getService } from "@/data/services";

const service = getService("automation")!;

export const metadata: Metadata = pageMetadata({
  title: "Workflow & Business Process Automation",
  description:
    "Automate the work your team shouldn't still do by hand: lead intake, CRM updates, document extraction, reporting, approvals. AI only where judgement is needed.",
  path: `/services/${service.slug}`,
});

export default function AutomationServicePage() {
  return <ServiceDetail service={service} />;
}
