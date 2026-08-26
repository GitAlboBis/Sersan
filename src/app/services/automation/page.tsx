import type { Metadata } from "next";
import ServiceDetail from "@/components/sections/service-detail";
import { getService } from "@/data/services";

const service = getService("automation")!;

export const metadata: Metadata = {
  // Distinct search intent per service — the four pages used to share one
  // template title and compete with each other.
  title: "Workflow & Business Process Automation",
  description:
    "Automate the work your team should not still be doing manually: lead intake, CRM updates, document extraction, reporting, approvals and internal admin. Rule-based where rules are enough, AI only where judgement is required.",
  alternates: { canonical: `/services/${service.slug}` },
  robots: { index: true, follow: true },
};

export default function AutomationServicePage() {
  return <ServiceDetail service={service} />;
}
