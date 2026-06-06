"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { motion } from "framer-motion";
import { ChevronDown, MessageSquareQuote } from "lucide-react";
import { RevealOnScroll } from "@/components/reveal-on-scroll";
import { useLanguage } from "@/components/language-provider";

function buildFaqs(isEn: boolean) {
  return [
    {
      q: isEn
        ? '"What kind of projects do you take on?"'
        : '"Che tipo di progetti accettate?"',
      a: isEn
        ? "Complex builds that need senior people on the keyboard: enterprise architecture, AI and ML in production, data platforms, technical leadership. If you need a WordPress site or a landing page, you'll be much better served by someone else."
        : "Build complessi che richiedono persone senior alla tastiera: architettura enterprise, AI e ML in produzione, data platform, technical leadership.",
    },
    {
      q: isEn
        ? '"How is this different from a dev agency?"'
        : '"In cosa siete diversi da un\'agenzia di sviluppo?"',
      a: isEn
        ? "Agencies tend to put junior developers on your project for long stretches. We put senior engineers and architects on it, the same people who've actually built and run production systems before."
        : "Le agenzie tendono a mettere sviluppatori junior sui progetti. Noi ci mettiamo engineer e architect senior che hanno già costruito e fatto girare sistemi in produzione.",
    },
    {
      q: isEn
        ? '"What does a typical engagement look like?"'
        : '"Come è strutturato un ingaggio tipico?"',
      a: isEn
        ? "We usually work in one of three ways: a Technical Audit (1–2 weeks of diagnosis), a Delivery Sprint (2–4 weeks focused on shipping something specific), or Fractional CTO (ongoing technical leadership)."
        : "Lavoriamo in tre modi: Technical Audit (1–2 settimane di diagnosi), Delivery Sprint (2–4 settimane focalizzate sulla consegna), o Fractional CTO (leadership tecnica continuativa).",
    },
    {
      q: isEn
        ? '"We already have engineers. Why would we need you?"'
        : '"Abbiamo già engineer. Perché dovremmo prendervi?"',
      a: isEn
        ? "Your team is probably heads-down on features. We come in for the architecture, infrastructure, and ML pipeline problems that need someone with that specific background."
        : "Il vostro team è probabilmente focalizzato sulle feature. Noi entriamo per i problemi di architettura, infrastruttura e ML pipeline che richiedono un background specifico.",
    },
    {
      q: isEn ? '"How quickly can you start?"' : '"Quanto velocemente partite?"',
      a: isEn
        ? "Usually within one or two weeks of signing. We run a short discovery session, agree on scope, and get going. No three-month onboarding."
        : "Di solito entro una o due settimane dalla firma. Sessione di discovery breve, scope concordato, si parte.",
    },
    {
      q: isEn
        ? '"What\'s the smallest engagement?"'
        : '"Qual è l\'ingaggio più piccolo?"',
      a: isEn
        ? "A Technical Audit, typically 1–2 weeks. There's no long-term lock-in. If we add value you'll want to keep working with us; if we don't, you won't."
        : "Un Technical Audit, tipicamente 1–2 settimane. Nessun lock-in di lungo periodo.",
    },
    {
      q: isEn
        ? '"Do you work with startups, or only with enterprises?"'
        : '"Lavorate con startup o solo enterprise?"',
      a: isEn
        ? "Both. We work with funded startups setting up their first real production architecture, and with enterprises trying to drag legacy systems into the present."
        : "Entrambi. Startup finanziate che impostano la prima architettura di produzione e enterprise che modernizzano legacy.",
    },
    {
      q: isEn
        ? '"What technologies do you specialise in?"'
        : '"Su quali tecnologie siete specializzati?"',
      a: isEn
        ? "Cloud-native architectures (AWS, GCP, Azure), Python and TypeScript stacks, ML/AI pipelines (MLflow, Kubeflow, SageMaker), data platforms (Spark, dbt, Airflow), and modern frontend/backend systems."
        : "Architetture cloud-native (AWS, GCP, Azure), stack Python e TypeScript, pipeline ML/AI (MLflow, Kubeflow, SageMaker), data platform (Spark, dbt, Airflow).",
    },
    {
      q: isEn ? '"How much does this cost?"' : '"Quanto costa?"',
      a: isEn
        ? "It depends on the shape of the work. Audits are a fixed fee, Delivery Sprints are priced per project, and Fractional CTO is a monthly retainer. After a 30-minute scoping call we'll send you a clear quote."
        : "Dipende dalla forma del lavoro. Audit a fee fisso, Sprint a prezzo per progetto, Fractional CTO a retainer mensile.",
    },
  ];
}

/**
 * FAQSection — Radix-based accordion with brass left-rail when open. Emits
 * FAQPage JSON-LD for SEO.
 */
export default function FAQSection() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const FAQS = buildFaqs(isEn);
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <section id="faq-section" className="section relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="container-px">
        <RevealOnScroll
          delay={0}
          className="text-center mb-12 max-w-3xl mx-auto"
        >
          <p className="eyebrow mb-5">
            {isEn ? "Plain answers" : "Risposte chiare"}
          </p>
          <h2 className="font-display text-3xl sm:text-[2.5rem] text-ink leading-[1.12] tracking-tight text-balance mb-4">
            {isEn ? "Before you " : "Prima di "}
            <span className="italic text-accent">
              {isEn ? "work with us" : "lavorare con noi"}
            </span>
          </h2>
          <p className="text-lg text-ink-mute max-w-2xl mx-auto leading-[1.5]">
            {isEn
              ? "The questions we get most often."
              : "Le domande che riceviamo più spesso."}
          </p>
        </RevealOnScroll>

        <div className="max-w-3xl mx-auto">
          <Accordion.Root type="single" collapsible className="space-y-2.5">
            {FAQS.map((faq, index) => (
              <Accordion.Item
                key={index}
                value={`item-${index}`}
                className="relative rounded-xl border border-[hsl(var(--rule)/0.4)] bg-surface/40 backdrop-blur-[1px] px-6 transition-colors data-[state=open]:border-[hsl(var(--accent)/0.55)] data-[state=open]:bg-surface/70 data-[state=open]:before:absolute data-[state=open]:before:left-0 data-[state=open]:before:top-3 data-[state=open]:before:bottom-3 data-[state=open]:before:w-px data-[state=open]:before:bg-[hsl(var(--accent))] data-[state=open]:before:rounded-full"
              >
                <Accordion.Header className="flex">
                  <Accordion.Trigger className="flex flex-1 items-center justify-between text-left text-ink hover:text-accent py-5 text-base font-medium group [&[data-state=open]>svg]:rotate-180 transition-colors">
                    <span className="flex items-center gap-3">
                      <MessageSquareQuote
                        className="w-4 h-4 group-hover:text-accent transition-colors flex-shrink-0"
                        style={{ color: "hsl(var(--accent) / 0.55)" }}
                      />
                      <span className="text-left">{faq.q}</span>
                    </span>
                    <ChevronDown
                      className="h-4 w-4 shrink-0 text-ink-mute transition-transform duration-200 group-hover:text-accent group-[[data-state=open]]:text-accent"
                      aria-hidden="true"
                    />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="text-ink-mute pb-5 text-sm leading-[1.6] overflow-hidden data-[state=closed]:animate-[accordion-up_200ms_ease-out] data-[state=open]:animate-[accordion-down_200ms_ease-out]">
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="pl-7"
                  >
                    {faq.a}
                  </motion.div>
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </div>
      </div>
    </section>
  );
}
