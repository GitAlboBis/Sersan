// TODO: replace this stub with a real CMS source (Sanity, MDX in repo, etc.).
// For now the Writing index and detail pages read from this hand-authored list.

export type ResourceCategory = "article" | "guide" | "case-study" | "whitepaper";

export interface Resource {
  slug: string;
  title: string;
  titleIt: string;
  excerpt: string;
  excerptIt: string;
  category: ResourceCategory;
  publishedAt: string; // ISO date
  readMinutes: number;
  authorName: string;
  authorRole: string;
  authorRoleIt: string;
  tags: string[];
  /** Markdown-ish body, rendered as paragraphs and headings. */
  body: string;
  /** Italian counterpart of `body`, same markdown-ish format. */
  bodyIt: string;
}

export const resources: Resource[] = [
  {
    slug: "what-an-ai-audit-actually-looks-like",
    title: "What a technical audit actually finds in your business",
    titleIt: "Cosa trova davvero un audit tecnico dentro la vostra azienda",
    excerpt:
      "Most audits are a discovery call in a trench coat. Here's what a real one produces, and why we charge for it.",
    excerptIt:
      "La maggior parte degli audit è una call conoscitiva travestita. Ecco cosa produce uno vero, e perché lo facciamo pagare.",
    category: "article",
    publishedAt: "2026-04-12",
    readMinutes: 7,
    authorName: "Michele Sanna",
    authorRole: "Co-Founder & CPTO, SerSan",
    authorRoleIt: "Co-Founder & CPTO, SerSan",
    tags: ["audit", "ai-strategy", "process"],
    body: `## Why most audits are theatre

A discovery call in a trench coat. Thirty minutes of qualification questions and a deck full of "AI could help here" platitudes. That is not an audit. That is a sales process pretending to be a deliverable.

## What we actually do

A senior engineer spends 2–6 business days inside the business. Read access to whatever exists — repos, dashboards, spreadsheets, the tools your team works in every day. Calendar time with the handful of people who actually run the work.

Scope varies with the question. A focused diagnostic looks at one workflow, one product problem or one system. A full audit takes in the architecture, the data, the tooling and how work actually gets delivered.

At the end you get a written document, as long as it needs to be. Never a slide deck.

## What the report contains

- Executive summary written for whoever decides and whoever builds
- What's broken, ranked by business impact, not technical debt
- What's manual, with realistic time-savings estimates
- What AI can actually do inside your product, and what it can't, said honestly
- What we'd build first, scoped, sequenced, with rough effort estimates
- A 90-day roadmap if you wanted to start tomorrow

## You keep it whether you hire us or not

The deliverable is yours. Hand it to your internal team, hand it to another vendor, or sit on it. The roadmap doesn't expire.`,
    bodyIt: `## Perché la maggior parte degli audit è teatro

Una call conoscitiva travestita. Trenta minuti di domande di qualificazione e una presentazione piena di banalità del tipo "qui l'AI potrebbe aiutare". Questo non è un audit. È un processo di vendita che si finge un deliverable.

## Cosa facciamo davvero

Un ingegnere senior passa 2–6 giorni lavorativi dentro l'azienda. Accesso in lettura a quello che esiste: repository, dashboard, fogli di calcolo, gli strumenti con cui il vostro team lavora ogni giorno. Tempo in agenda con le poche persone che mandano avanti il lavoro.

Lo scope dipende dalla domanda. Una diagnosi mirata guarda un processo, un problema di prodotto o un singolo sistema. Un audit completo comprende architettura, dati, strumenti e il modo in cui il lavoro viene davvero consegnato.

Alla fine avete un documento scritto, lungo quanto serve. Mai una presentazione.

## Cosa contiene il report

- Un executive summary scritto per chi decide e per chi lo dovrà realizzare
- Cosa è rotto, ordinato per impatto sul business, non per debito tecnico
- Cosa è manuale, con stime realistiche di tempo risparmiato
- Cosa l'AI può fare davvero dentro il vostro prodotto, e cosa no, detto onestamente
- Cosa costruiremmo per primo, con scope, sequenza e stime di effort di massima
- Una roadmap a 90 giorni, se voleste partire domani

## Resta vostro che ci ingaggiate o meno

Il deliverable è vostro. Datelo al vostro team interno, datelo a un altro fornitore, oppure tenetelo nel cassetto. La roadmap non ha scadenza.`,
  },
  {
    slug: "scope-you-can-stop-after-any-phase",
    title: "Scope you can stop after any phase",
    titleIt: "Uno scope che potete fermare a fine fase",
    excerpt:
      "Why every phase has its own scope, its own price and its own end — and why you can stop after any one of them.",
    excerptIt:
      "Perché ogni fase ha il suo scope, il suo prezzo e la sua fine, e perché potete fermarvi dopo ognuna di esse.",
    category: "article",
    publishedAt: "2026-03-28",
    readMinutes: 5,
    authorName: "Alessandro Serratt",
    authorRole: "Co-Founder & CEO, SerSan",
    authorRoleIt: "Co-Founder & CEO, SerSan",
    tags: ["engagement-model", "pricing"],
    body: `## Every phase has an end

Consulting has a habit of selling the open-ended: long contracts, deliverables nobody can quantify, and a steady hum of "we're working on it" that nobody wants to interrupt.

We scope the other way round. Every phase — a diagnostic, a build, a stretch of continued development — has its own scope, its own price and its own end. When it ends it actually ends, and the next one is a decision rather than a default.

## Continuation is earned, not assumed

None of that means the work has to stop. Plenty of clients keep going: more development, support, optimisation, fractional technical leadership. We are glad to do all of it, and we do. The difference is that each stretch is scoped and priced on its own, against what the last one actually produced.

A long relationship is entirely possible. It just gets re-earned at every step instead of renewing quietly in the background.

## Why this is good for both sides

It forces us to ship something visible in every phase, because the next phase depends on the last one having been worth it. It keeps the conversation about value rather than hours. And it means you can stop without a negotiation — which is the only thing that makes "you can stop" true.`,
    bodyIt: `## Ogni fase ha una fine

La consulenza ha l'abitudine di vendere l'indefinito: contratti lunghi, deliverable che nessuno riesce a quantificare e un costante brusio di "ci stiamo lavorando" che nessuno ha voglia di interrompere.

Noi definiamo lo scope al contrario. Ogni fase — una diagnosi, una build, un periodo di sviluppo continuativo — ha il suo scope, il suo prezzo e la sua fine. Quando finisce, finisce davvero, e quella successiva è una decisione, non un rinnovo automatico.

## La continuità si guadagna, non si dà per scontata

Niente di tutto questo significa che il lavoro debba fermarsi. Molti clienti proseguono: altro sviluppo, supporto, ottimizzazione, direzione tecnica frazionale. Lo facciamo volentieri, e lo facciamo spesso. La differenza è che ogni tratto ha uno scope e un prezzo propri, misurati su ciò che ha prodotto il precedente.

Una relazione lunga è del tutto possibile. Va solo riguadagnata a ogni passo, invece di rinnovarsi in silenzio sullo sfondo.

## Perché questo è un bene per entrambe le parti

Ci costringe a rilasciare qualcosa di visibile in ogni fase, perché la fase successiva dipende dal fatto che la precedente sia valsa la pena. Mantiene la conversazione sul valore, non sulle ore. E significa che potete fermarvi senza una trattativa: l'unica cosa che rende vero il "potete fermarvi".`,
  },
  {
    slug: "production-ai-not-demos",
    title: "Production systems, not demos",
    titleIt: "Sistemi in produzione, non demo",
    excerpt:
      "The gap between a working demo and a system your business can rely on is wider than most teams realise.",
    excerptIt:
      "Il divario tra una demo funzionante e un sistema su cui l'azienda può contare è più ampio di quanto la maggior parte dei team immagini.",
    category: "guide",
    publishedAt: "2026-02-14",
    readMinutes: 9,
    authorName: "Michele Sanna",
    authorRole: "Co-Founder & CPTO, SerSan",
    authorRoleIt: "Co-Founder & CPTO, SerSan",
    tags: ["mlops", "production", "ai-engineering"],
    body: `## The demo is the easy part

A working demo on a senior engineer's laptop is one or two days of work. A system that handles a hundred thousand requests a day at p99 latency, fails gracefully, gets observed, gets rolled back, and obeys whatever regulatory regime sits over your industry. That is months.

Not every system needs all of that. A two-week automation that fails loudly and can be safely re-run is production-ready for what it does, and loading it with platform ceremony just makes it expensive. The list below is what production-grade means when production-grade is actually required.

## What "production-ready" actually means

- Reproducible builds and infrastructure-as-code
- Observability: tracing, metrics, structured logs, model performance dashboards
- A defined rollback path that works under stress
- Cost monitoring with alerting before the bill becomes a problem
- Documentation that survives the engineer who wrote it leaving

## The order of operations

In nine cases out of ten, the data plane needs work before the model is worth touching. Untangling the upstream pipelines, adding observability, and shoring up the boring infrastructure is usually 60–70% of the engagement.`,
    bodyIt: `## La demo è la parte facile

Una demo funzionante sul laptop di un ingegnere senior è uno o due giorni di lavoro. Un sistema che gestisce centomila richieste al giorno a una latenza p99, fallisce in modo controllato, viene osservato, viene riportato indietro con un rollback e rispetta qualunque regime normativo gravi sul vostro settore. Quelli sono mesi.

Non a tutti i sistemi serve tutto questo. Un'automazione da due settimane che fallisce in modo visibile e può essere rilanciata in sicurezza è pronta per quello che deve fare, e caricarla di cerimoniale da piattaforma la rende solo costosa. L'elenco qui sotto è cosa significa production-grade quando production-grade serve davvero.

## Cosa significa davvero "production-ready"

- Build riproducibili e infrastructure-as-code
- Observability: tracing, metriche, log strutturati, dashboard sulle performance del modello
- Un percorso di rollback definito che regge sotto stress
- Monitoraggio dei costi con alerting prima che la fattura diventi un problema
- Documentazione che sopravvive all'uscita dell'ingegnere che l'ha scritta

## L'ordine delle operazioni

In nove casi su dieci, il data plane richiede lavoro prima che valga la pena toccare il modello. Districare le pipeline a monte, aggiungere observability e consolidare la noiosa infrastruttura è di solito il 60–70% dell'ingaggio.`,
  },
];

export function getResourceBySlug(slug: string): Resource | undefined {
  return resources.find((r) => r.slug === slug);
}
