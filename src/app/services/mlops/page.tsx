import type { Metadata } from "next";
import ServiceDetail from "@/components/sections/service-detail";
import { getService } from "@/data/services";

const service = getService("mlops")!;

export const metadata: Metadata = {
  // Distinct search intent per service — the four pages used to share one
  // template title and compete with each other.
  title: "AI Reliability, RAG, Agents & MLOps",
  description:
    "Make AI features reliable enough to depend on: evaluation, monitoring, cost control, deployment and rollback for copilots, RAG systems, agents and production models.",
  alternates: { canonical: `/services/${service.slug}` },
  robots: { index: true, follow: true },
};

export default function MlopsServicePage() {
  return <ServiceDetail service={service} />;
}
