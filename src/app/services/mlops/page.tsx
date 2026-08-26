import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import ServiceDetail from "@/components/sections/service-detail";
import { getService } from "@/data/services";

const service = getService("mlops")!;

export const metadata: Metadata = pageMetadata({
  title: "AI Reliability, RAG, Agents & MLOps",
  description:
    "Make AI features reliable enough to depend on: evaluation, monitoring, cost control, deployment and governance for RAG, copilots, agents and production ML.",
  path: `/services/${service.slug}`,
});

export default function MlopsServicePage() {
  return <ServiceDetail service={service} />;
}
