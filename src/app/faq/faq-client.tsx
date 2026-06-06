"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/language-provider";

const LAST_UPDATED = "2026-03-10";

type FaqCategory = "Services" | "Engagements" | "Technical" | "Data & Privacy";

interface FaqItem {
  q: { en: string; it: string };
  a: { en: string; it: string };
  category: FaqCategory;
}

const categoryLabels: Record<FaqCategory, { en: string; it: string }> = {
  Services: { en: "Services", it: "Servizi" },
  Engagements: { en: "Engagements", it: "Ingaggi" },
  Technical: { en: "Technical", it: "Tecnico" },
  "Data & Privacy": { en: "Data & Privacy", it: "Dati e Privacy" },
};

const faqs: FaqItem[] = [
  // Services
  {
    category: "Services",
    q: {
      en: "What does SERSAN do?",
      it: "Di cosa si occupa SERSAN?",
    },
    a: {
      en: "We're a small technology consultancy. The work tends to land in one of a few places: enterprise architecture, MLOps, data platforms, and the operational changes that come with all of that. We build the systems, not slide decks about them, and we mostly work with B2B companies.",
      it: "Siamo una piccola società di consulenza tecnologica. Il lavoro tende a concentrarsi su pochi ambiti: architetture enterprise, MLOps, piattaforme dati e i cambiamenti operativi che ne derivano. Costruiamo sistemi, non presentazioni che li descrivono, e lavoriamo principalmente con aziende B2B.",
    },
  },
  {
    category: "Services",
    q: {
      en: "What services do you offer?",
      it: "Quali servizi offrite?",
    },
    a: {
      en: "Three formats, depending on what you need. A Tech Audit is a fixed-scope architecture review that ends with a prioritised backlog. A Delivery Sprint is the hands-on version: design, build, test, hand it over. A Fractional CTO engagement means we own the roadmap, architecture governance, and delivery leadership over a longer period.",
      it: "Tre formati, a seconda di ciò che vi serve. Un Tech Audit è una review architetturale a scopo definito che si chiude con un backlog prioritizzato. Un Delivery Sprint è la versione operativa: progettazione, build, test, handover. Un ingaggio Fractional CTO significa che ci occupiamo di roadmap, governance architetturale e leadership di delivery su un periodo più lungo.",
    },
  },
  {
    category: "Services",
    q: {
      en: "How are you different from a dev agency?",
      it: "In cosa siete diversi da un'agenzia di sviluppo?",
    },
    a: {
      en: "Most agencies build to spec. We try to work out what the real problem is first, and then build the right thing. Our CPTO Michele Sanna spent years at J.P. Morgan, Deloitte, Revolut, Brevan Howard, and Accenture, so the strategy side and the engineering side are coming from the same person.",
      it: "Le agenzie di solito costruiscono su specifica. Noi cerchiamo prima di capire qual è il problema reale, poi costruiamo la cosa giusta. Il nostro CPTO Michele Sanna ha lavorato anni in J.P. Morgan, Deloitte, Revolut, Brevan Howard e Accenture: strategia e ingegneria arrivano dalla stessa persona.",
    },
  },
  {
    category: "Services",
    q: {
      en: "What industries do you work with?",
      it: "Con quali settori lavorate?",
    },
    a: {
      en: "B2B SaaS, fintech, healthtech, professional services, and enterprise. We tend to be a fit for companies with genuinely complex technical problems where they need someone senior to think with them, not just more developers on the keyboard.",
      it: "B2B SaaS, fintech, healthtech, servizi professionali ed enterprise. Tendiamo a essere la scelta giusta per aziende con problemi tecnici davvero complessi, dove serve qualcuno senior che ragioni insieme a loro, non solo altri sviluppatori alla tastiera.",
    },
  },
  // Engagements
  {
    category: "Engagements",
    q: {
      en: "How much does it cost?",
      it: "Quanto costa?",
    },
    a: {
      en: "It depends on the work. Tech Audits are fixed-price. Delivery Sprints are scoped per project. Fractional CTO is based on time allocation. After a short scoping call we'll come back with a clear proposal, usually within a business day.",
      it: "Dipende dal lavoro. I Tech Audit sono a prezzo fisso. I Delivery Sprint sono dimensionati progetto per progetto. Il Fractional CTO è basato sull'allocazione di tempo. Dopo una breve call di scoping vi mandiamo una proposta chiara, di solito entro un giorno lavorativo.",
    },
  },
  {
    category: "Engagements",
    q: {
      en: "How long does a typical engagement last?",
      it: "Quanto dura un ingaggio tipico?",
    },
    a: {
      en: "Tech Audits are usually 1–2 weeks. Delivery Sprints run 4–8 weeks. Fractional CTO engagements are ongoing, typically 3–12 months. We scope each one up front so nothing comes out of nowhere later.",
      it: "I Tech Audit durano in genere 1–2 settimane. I Delivery Sprint 4–8 settimane. Gli ingaggi di Fractional CTO sono continuativi, tipicamente 3–12 mesi. Definiamo lo scope in anticipo, così non emergono sorprese in corso d'opera.",
    },
  },
  {
    category: "Engagements",
    q: {
      en: "Do you offer a pilot or trial?",
      it: "Offrite un pilot o un periodo di prova?",
    },
    a: {
      en: "Yes. For larger AI builds, we'll do a scoped pilot to make sure the idea actually works before anyone commits to the full thing. For consulting more generally, the Tech Audit plays the same role. You get a complete picture before we touch implementation.",
      it: "Sì. Per i build AI più grandi facciamo un pilot a scope definito, per verificare che l'idea funzioni davvero prima di impegnarci sul progetto pieno. Più in generale per la consulenza, è il Tech Audit a svolgere questo ruolo: avete un quadro completo prima di toccare l'implementazione.",
    },
  },
  // Technical
  {
    category: "Technical",
    q: {
      en: "What technologies do you work with?",
      it: "Con quali tecnologie lavorate?",
    },
    a: {
      en: "We try not to be religious about it. Most of our work happens in Python, TypeScript, on AWS / GCP / Azure, with Kubernetes, Terraform, and the usual modern ML stack. We pick the tool that fits the problem, not the most fashionable one.",
      it: "Cerchiamo di non essere dogmatici. La maggior parte del lavoro avviene in Python e TypeScript, su AWS / GCP / Azure, con Kubernetes, Terraform e lo stack ML moderno. Scegliamo lo strumento adatto al problema, non quello più di moda.",
    },
  },
  {
    category: "Technical",
    q: {
      en: "Can you integrate with our existing systems?",
      it: "Riuscite a integrarvi con i nostri sistemi esistenti?",
    },
    a: {
      en: "Yes. Integration is usually most of the work. We've connected to CRMs, data warehouses, CI/CD pipelines, monitoring stacks, and pretty much any internal API a business runs on.",
      it: "Sì. L'integrazione è di solito la parte più consistente del lavoro. Ci siamo collegati a CRM, data warehouse, pipeline CI/CD, stack di monitoring e praticamente a qualsiasi API interna su cui un'azienda si appoggia.",
    },
  },
  {
    category: "Technical",
    q: {
      en: "How do you handle knowledge transfer?",
      it: "Come gestite il passaggio di conoscenze?",
    },
    a: {
      en: "Every engagement ends with documentation, architecture decision records, team walkthroughs, and a proper handover. The goal is that your team owns the thing long after we've gone. We'd rather you don't need us next year than that you do.",
      it: "Ogni ingaggio si chiude con documentazione, architecture decision record, walkthrough con il team e un handover formale. L'obiettivo è che il vostro team mantenga in autonomia il sistema molto dopo la nostra uscita. Preferiamo che l'anno prossimo non abbiate bisogno di noi piuttosto che il contrario.",
    },
  },
  // Data & Privacy
  {
    category: "Data & Privacy",
    q: {
      en: "Are you GDPR compliant?",
      it: "Siete conformi al GDPR?",
    },
    a: {
      en: "Yes. We have the usual data processing agreements, consent handling, and retention policies in place. Infrastructure is hosted in the EU (London) and SOC 2 Type II certification is in progress.",
      it: "Sì. Abbiamo in essere data processing agreement, gestione del consenso e policy di retention. L'infrastruttura è ospitata nell'UE (Londra) e la certificazione SOC 2 Type II è in corso.",
    },
  },
  {
    category: "Data & Privacy",
    q: {
      en: "Who owns the intellectual property?",
      it: "A chi appartiene la proprietà intellettuale?",
    },
    a: {
      en: "You do. All code, documentation, and deliverables produced during the engagement are yours. We don't retain rights to anything we build for you.",
      it: "A voi. Tutto il codice, la documentazione e i deliverable prodotti durante l'ingaggio sono vostri. Non manteniamo diritti su nulla di ciò che costruiamo per voi.",
    },
  },
  {
    category: "Data & Privacy",
    q: {
      en: "Where is your infrastructure hosted?",
      it: "Dove è ospitata la vostra infrastruttura?",
    },
    a: {
      en: "Cloud providers in London (EU), with encryption at rest and in transit, SOC 2 Type II certification in progress, and regular security audits. Client data is never mixed between engagements.",
      it: "Su cloud provider a Londra (UE), con cifratura at-rest e in-transit, certificazione SOC 2 Type II in corso e audit di sicurezza regolari. I dati dei clienti non vengono mai mescolati tra ingaggi diversi.",
    },
  },
];

const categories: FaqCategory[] = ["Services", "Engagements", "Technical", "Data & Privacy"];

export function FaqClient() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<FaqCategory | "All">("All");

  const filtered = useMemo(() => {
    return faqs.filter((f) => {
      const q = isEn ? f.q.en : f.q.it;
      const a = isEn ? f.a.en : f.a.it;
      const matchesCategory = activeCategory === "All" || f.category === activeCategory;
      const matchesSearch =
        search === "" ||
        q.toLowerCase().includes(search.toLowerCase()) ||
        a.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [search, activeCategory, isEn]);

  return (
    <div className="min-h-screen relative">
      <div className="container-px max-w-4xl pt-28 pb-20 relative z-10">
        <p className="eyebrow mb-6 inline-flex items-center gap-2">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: "hsl(var(--accent))" }}
            aria-hidden="true"
          />
          {isEn
            ? `${faqs.length} questions · Last updated ${LAST_UPDATED}`
            : `${faqs.length} domande · Ultimo aggiornamento ${LAST_UPDATED}`}
        </p>

        <h1 className="font-display text-[clamp(2.25rem,6vw,4rem)] leading-[1.15] tracking-[-0.025em] text-ink mb-8 pb-1">
          {isEn ? (
            <>
              The questions buyers{" "}
              <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                actually ask.
              </span>
            </>
          ) : (
            <>
              Le domande che i clienti{" "}
              <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                ci fanno davvero.
              </span>
            </>
          )}
        </h1>

        <p className="text-lg text-ink-mute mb-10 max-w-2xl leading-[1.55]">
          {isEn
            ? "Engagement model, pricing, what we won't take on, how we handle your data. Straight answers, no marketing."
            : "Modello di ingaggio, prezzi, cosa non accettiamo, come gestiamo i vostri dati. Risposte dirette, niente marketing."}
        </p>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={isEn ? "Search questions..." : "Cerca tra le domande..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-surface/40 border-rule/70 backdrop-blur-[1px]"
          />
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveCategory("All")}
            className={`text-[10px] font-mono uppercase tracking-[0.14em] px-3 py-1.5 rounded-full border transition-colors ${
              activeCategory === "All"
                ? "border-[hsl(var(--accent)/0.55)] text-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.08)]"
                : "border-rule/70 text-ink-mute hover:text-ink hover:border-rule"
            }`}
          >
            {isEn ? `All (${faqs.length})` : `Tutte (${faqs.length})`}
          </button>
          {categories.map((cat) => {
            const count = faqs.filter((f) => f.category === cat).length;
            const label = isEn ? categoryLabels[cat].en : categoryLabels[cat].it;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-[10px] font-mono uppercase tracking-[0.14em] px-3 py-1.5 rounded-full border transition-colors ${
                  activeCategory === cat
                    ? "border-[hsl(var(--accent)/0.55)] text-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.08)]"
                    : "border-rule/70 text-ink-mute hover:text-ink hover:border-rule"
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>

        {/* Accordion */}
        <h2 className="sr-only">{isEn ? "Frequently asked questions" : "Domande frequenti"}</h2>
        {filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">
            {isEn
              ? "No questions match your search. Try a different term."
              : "Nessuna domanda corrisponde alla ricerca. Provate un altro termine."}
          </p>
        ) : (
          <Accordion type="single" collapsible className="space-y-3">
            {filtered.map((faq, i) => {
              const q = isEn ? faq.q.en : faq.q.it;
              const a = isEn ? faq.a.en : faq.a.it;
              const catLabel = isEn ? categoryLabels[faq.category].en : categoryLabels[faq.category].it;
              return (
                <AccordionItem
                  key={`${faq.category}-${i}`}
                  value={`faq-${faq.category}-${i}`}
                  className="rounded-xl border border-rule/70 bg-surface/40 backdrop-blur-[1px] px-6 transition-colors data-[state=open]:border-[hsl(var(--accent)/0.5)] data-[state=open]:bg-surface/60"
                >
                  <AccordionTrigger className="text-ink hover:text-[hsl(var(--accent))] hover:no-underline font-medium text-left py-5 text-sm">
                    <span className="flex items-center gap-3">
                      <span
                        className="text-[10px] font-mono uppercase tracking-[0.14em] px-2 py-0.5 rounded border border-rule/60 shrink-0"
                        style={{ color: "hsl(var(--accent))" }}
                      >
                        {catLabel}
                      </span>
                      {q}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-ink-mute pb-5 text-sm leading-[1.6]">{a}</AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}

        {/* CTA */}
        <div
          className="mt-16 p-8 rounded-xl border text-center"
          style={{
            borderColor: "hsl(var(--accent) / 0.3)",
            background: "linear-gradient(135deg, hsl(var(--accent) / 0.05) 0%, transparent 60%)",
          }}
        >
          <p className="eyebrow mb-3">
            {isEn ? "Didn't find your answer?" : "Non avete trovato risposta?"}
          </p>
          <h2 className="font-display text-2xl text-ink mb-3 leading-tight">
            {isEn ? (
              <>
                Talk to a{" "}
                <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                  senior engineer.
                </span>
              </>
            ) : (
              <>
                Parla con un{" "}
                <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                  ingegnere senior.
                </span>
              </>
            )}
          </h2>
          <p className="text-ink-mute mb-6 text-sm leading-[1.55]">
            {isEn
              ? "A 30-minute scoping call covers what a list of FAQs never will."
              : "Una call di scoping di 30 minuti copre quello che una lista di FAQ non potrà mai dire."}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/audit"
              className="inline-flex items-center justify-center rounded-full px-6 py-3 min-h-[44px] text-sm font-medium transition-colors"
              style={{ background: "hsl(var(--accent))", color: "hsl(var(--bg))" }}
            >
              {isEn ? "Book a scoping call" : "Prenota una call di scoping"}
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-full border px-6 py-3 min-h-[44px] text-sm font-medium text-ink hover:text-[hsl(var(--accent))] hover:border-[hsl(var(--accent))] transition-colors"
              style={{ borderColor: "hsl(var(--rule))" }}
            >
              {isEn ? "Contact us" : "Contattaci"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
