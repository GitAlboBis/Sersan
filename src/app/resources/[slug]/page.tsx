import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resources, getResourceBySlug } from "@/data/resources";
import { ResourceDetailClient } from "./resource-detail-client";

export async function generateStaticParams() {
  return resources.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const resource = getResourceBySlug(slug);
  if (!resource) {
    return { title: "Article not found" };
  }
  return {
    title: resource.title,
    description: resource.excerpt,
    alternates: { canonical: `/resources/${resource.slug}` },
  };
}

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resource = getResourceBySlug(slug);

  if (!resource) {
    notFound();
  }

  const idx = resources.findIndex((r) => r.slug === resource.slug);
  const prev = idx > 0 ? resources[idx - 1] : null;
  const next = idx < resources.length - 1 ? resources[idx + 1] : null;

  return (
    <ResourceDetailClient
      resource={resource}
      prev={prev ? { slug: prev.slug, title: prev.title, titleIt: prev.titleIt } : null}
      next={next ? { slug: next.slug, title: next.title, titleIt: next.titleIt } : null}
    />
  );
}
