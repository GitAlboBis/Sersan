import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { caseStudies } from "@/data/case-studies";
import { CaseStudyDetailClient } from "./case-study-detail-client";

export async function generateStaticParams() {
  return caseStudies.map((s) => ({ slug: s.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const study = caseStudies.find((s) => s.id === slug);
  if (!study) {
    return { title: "Case study not found" };
  }
  return {
    title: `${study.client}, ${study.engagement}`,
    description: study.summary,
    alternates: { canonical: `/case-studies/${study.id}` },
  };
}

export default async function CaseStudyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const study = caseStudies.find((s) => s.id === slug);

  if (!study) {
    notFound();
  }

  const idx = caseStudies.findIndex((s) => s.id === study.id);
  const prevStudy = idx > 0 ? caseStudies[idx - 1] : caseStudies[caseStudies.length - 1];
  const nextStudy = idx < caseStudies.length - 1 ? caseStudies[idx + 1] : caseStudies[0];

  return <CaseStudyDetailClient study={study} prevStudy={prevStudy} nextStudy={nextStudy} />;
}
