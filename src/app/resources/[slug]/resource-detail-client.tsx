"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { Button, CTA_FLUID_SM } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/language-provider";
import type { Resource } from "@/data/resources";

/**
 * Lightweight markdown-ish renderer.
 * Supports `## heading`, `- bullet`, blank-line paragraph breaks. TODO: swap to
 * react-markdown or MDX once the CMS is wired in.
 */
function RenderBody({ body }: { body: string }) {
  const blocks = body.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="space-y-5 text-ink/85 leading-[1.7] text-[0.9375rem]">
      {blocks.map((block, i) => {
        if (block.startsWith("## ")) {
          return (
            <h2
              key={i}
              className="font-display text-2xl sm:text-[1.625rem] text-ink mt-10 mb-2 leading-tight tracking-tight"
            >
              {block.slice(3)}
            </h2>
          );
        }
        if (block.startsWith("- ")) {
          const items = block.split("\n").filter((l) => l.startsWith("- "));
          return (
            <ul key={i} className="list-disc pl-6 space-y-1.5">
              {items.map((it, j) => (
                <li key={j}>{it.slice(2)}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{block}</p>;
      })}
    </div>
  );
}

interface ResourceDetailClientProps {
  resource: Resource;
  prev: Pick<Resource, "slug" | "title" | "titleIt"> | null;
  next: Pick<Resource, "slug" | "title" | "titleIt"> | null;
}

export function ResourceDetailClient({ resource, prev, next }: ResourceDetailClientProps) {
  const { language } = useLanguage();
  const isEn = language === "en";

  const categoryLabel: Record<string, string> = isEn
    ? {
        article: "Article",
        guide: "Guide",
        "case-study": "Case study",
        whitepaper: "Whitepaper",
      }
    : {
        article: "Articolo",
        guide: "Guida",
        "case-study": "Case study",
        whitepaper: "Whitepaper",
      };

  const dateLocale = isEn ? "en-GB" : "it-IT";

  const title = isEn ? resource.title : resource.titleIt;
  const excerpt = isEn ? resource.excerpt : resource.excerptIt;
  const authorRole = isEn ? resource.authorRole : resource.authorRoleIt;
  const body = isEn ? resource.body : resource.bodyIt;

  return (
    <div className="min-h-[100svh] pt-24 pb-24 relative">
      <article className="container-px max-w-3xl">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-10">
          <Link
            href="/resources"
            className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] text-ink-mute hover:text-[hsl(var(--accent))] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {isEn ? "All writing" : "Tutti gli articoli"}
          </Link>
        </nav>

        {/* Header */}
        <header className="mb-12">
          <div className="flex flex-wrap items-center gap-3 mb-5 text-[10px] font-mono uppercase tracking-[0.16em] text-ink-mute">
            <span style={{ color: "hsl(var(--accent))" }}>{categoryLabel[resource.category]}</span>
            <span aria-hidden="true">·</span>
            <span>
              {new Date(resource.publishedAt).toLocaleDateString(dateLocale, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> {resource.readMinutes} min
            </span>
          </div>
          {/* key={language}: SplitText owns this subtree once split; a
              language swap must remount it or React reconciles against
              orphaned nodes (same contract as SectionHeading's h2). */}
          <h1 key={language} data-split-reveal className="font-display text-[clamp(2rem,5.5vw,3.5rem)] leading-[1.1] tracking-[-0.02em] text-ink text-balance mb-6">
            {title}
          </h1>
          <p className="text-lg text-ink-mute leading-[1.55] mb-6">{excerpt}</p>
          <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-ink-mute">
            {isEn ? "By" : "Di"} {resource.authorName} &middot; {authorRole}
          </p>
        </header>

        {/* Body */}
        <RenderBody body={body} />

        {/* Tags */}
        {resource.tags.length > 0 && (
          <div className="mt-14 pt-8 border-t border-rule/40">
            <p className="eyebrow mb-3">{isEn ? "Tags" : "Tag"}</p>
            <div className="flex flex-wrap gap-2">
              {resource.tags.map((t) => (
                <span
                  key={t}
                  className="px-3 py-1 text-[11px] font-mono uppercase tracking-[0.12em] rounded-full border border-rule/70 bg-surface/40 text-ink-mute"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <section className="mt-14 p-7 rounded-xl border border-rule/70 bg-surface/40">
          <p className="eyebrow mb-3" style={{ color: "hsl(var(--accent))" }}>
            {isEn ? "Next" : "Prossimo"}
          </p>
          <h3 className="font-display text-xl text-ink mb-3 leading-tight">
            {isEn ? (
              <>
                Want this kind of thinking in{" "}
                <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                  your engagement?
                </span>
              </>
            ) : (
              <>
                Volete questo modo di ragionare nel{" "}
                <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                  vostro ingaggio?
                </span>
              </>
            )}
          </h3>
          <div className="flex flex-col sm:flex-row gap-3 mt-5">
            <Button asChild size="lg" className={cn("group", CTA_FLUID_SM)}>
              <Link href="/audit">
                {isEn ? "Book a scoping call" : "Prenota una call di scoping"}
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className={CTA_FLUID_SM}>
              <Link href="/contact">{isEn ? "Or just say hello" : "Oppure scriveteci e basta"}</Link>
            </Button>
          </div>
        </section>

        {/* Prev / Next */}
        {(prev || next) && (
          <nav className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-12">
            {prev && (
              <Link
                href={`/resources/${prev.slug}`}
                className="group p-5 rounded-xl border border-rule/70 hover:border-[hsl(var(--accent)/0.5)] hover:bg-surface/40 transition-colors"
              >
                <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-mute mb-2 inline-flex items-center gap-1.5">
                  <ArrowLeft className="w-3 h-3" /> {isEn ? "Previous" : "Precedente"}
                </p>
                <p className="font-display text-lg text-ink leading-tight group-hover:text-[hsl(var(--accent))] transition-colors">
                  {isEn ? prev.title : prev.titleIt}
                </p>
              </Link>
            )}
            {next && (
              <Link
                href={`/resources/${next.slug}`}
                className="group p-5 rounded-xl border border-rule/70 hover:border-[hsl(var(--accent)/0.5)] hover:bg-surface/40 transition-colors text-right"
              >
                <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-mute mb-2 inline-flex items-center gap-1.5 justify-end w-full">
                  {isEn ? "Next" : "Successivo"} <ArrowRight className="w-3 h-3" />
                </p>
                <p className="font-display text-lg text-ink leading-tight group-hover:text-[hsl(var(--accent))] transition-colors">
                  {isEn ? next.title : next.titleIt}
                </p>
              </Link>
            )}
          </nav>
        )}
      </article>
    </div>
  );
}
