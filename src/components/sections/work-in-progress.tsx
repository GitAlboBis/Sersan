"use client";

import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { SectionGlow } from "@/components/ui/section-glow";
import { useLanguage } from "@/components/language-provider";

/**
 * WorkInProgress — surfaces what Sersan is currently building for itself, in
 * the open. Distinct from the shipped case studies: these are in-development
 * systems, marked with an "In development" status pill. No fabricated metrics,
 * no fake screenshots — high-level concept + tech tags only.
 *
 * `variant`:
 *   - "teaser" (homepage): compact, sits beside the case-studies section.
 *   - "full"   (work page): a touch more vertical breathing room as the first
 *     block above the shipped archive.
 *
 * Items are an array so adding more in-progress builds later is a one-liner.
 */

export interface WorkInProgressItem {
  title: string;
  status: string;
  description: string;
  tags: string[];
}

// Exported: the home case-studies rail renders the first entry as its closing
// "In development" card (restyle step 2 part B) — one copy source, two surfaces.
export const ITEMS_EN: WorkInProgressItem[] = [
  {
    title: "Multichannel Outbound",
    status: "In development",
    description:
      "Our own AI-driven multichannel outbound system: agent-written outreach coordinated across channels, built with the same production discipline we bring to client work.",
    tags: ["AI Agents", "Outbound", "Multichannel"],
  },
];

export const ITEMS_IT: WorkInProgressItem[] = [
  {
    title: "Multichannel Outbound",
    status: "In sviluppo",
    description:
      "Il nostro sistema di outbound multicanale guidato dall'AI: sequenze scritte dagli agenti e coordinate su più canali, costruito con la stessa disciplina di produzione del lavoro per i clienti.",
    tags: ["Agenti AI", "Outbound", "Multicanale"],
  },
];

function WorkInProgressCard({
  item,
  isIt,
}: {
  item: WorkInProgressItem;
  isIt: boolean;
}) {
  return (
    <article className="card-steel flex flex-col gap-5 p-7 sm:p-8 h-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-[hsl(var(--accent))]">
          {isIt ? "Sersan · Build interna" : "Sersan · Internal build"}
        </span>
        <span className="status-pill">
          <span className="status-dot" aria-hidden="true" />
          {item.status}
        </span>
      </div>

      <h3 className="font-display text-[1.5rem] sm:text-[1.7rem] text-ink leading-[1.12]">
        {item.title}
      </h3>

      <p className="text-[14.5px] text-ink-mute leading-relaxed">
        {item.description}
      </p>

      <ul className="mt-auto flex flex-wrap gap-1.5 pt-2">
        {item.tags.map((tag) => (
          <li
            key={tag}
            className="font-mono text-[10px] tracking-[0.06em] px-2 py-1 rounded border border-[hsl(var(--rule))] text-ink-mute"
          >
            {tag}
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function WorkInProgress({
  variant = "teaser",
}: {
  variant?: "teaser" | "full";
}) {
  const { language } = useLanguage();
  const isIt = language === "it";
  const items = isIt ? ITEMS_IT : ITEMS_EN;
  return (
    <section
      id="work-in-progress"
      className={`relative scroll-mt-24 overflow-hidden ${
        variant === "full" ? "section-lg" : "section"
      }`}
    >
      <SectionGlow position="top-right" intensity={0.8} size="50rem" />
      <div className="container-px relative">
        <SectionHeading
          eyebrow={isIt ? "Lavori in corso" : "Work in progress"}
          title={
            isIt ? (
              <>
                Costruiamo in{" "}
                <span className="font-display italic text-ink">trasparenza.</span>
              </>
            ) : (
              <>
                Building in the{" "}
                <span className="font-display italic text-ink">open.</span>
              </>
            )
          }
          description={
            isIt
              ? "I sistemi che stiamo costruendo per noi stessi, con lo stesso standard di produzione del lavoro per i clienti, mostrati prima del lancio."
              : "The systems we're building for ourselves right now, shipped to the same production bar as our client work, shown before they're done."
          }
        />

        <div
          className={`mt-12 grid grid-cols-1 gap-5 sm:gap-6 ${
            variant === "full"
              ? "md:grid-cols-2"
              : "md:grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {items.map((item, i) => (
            <Reveal key={item.title} delay={(i % 3) * 100}>
              <WorkInProgressCard item={item} isIt={isIt} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
