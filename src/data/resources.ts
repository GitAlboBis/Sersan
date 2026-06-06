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
    title: "What an AI audit actually looks like inside your stack",
    titleIt: "Com'è fatto davvero un audit AI dentro il vostro stack",
    excerpt:
      "Most AI audits are a discovery call in a trench coat. Here's what a real one produces, and why we charge for it.",
    excerptIt:
      "La maggior parte degli audit AI è una call conoscitiva travestita. Ecco cosa produce uno vero, e perché lo facciamo pagare.",
    category: "article",
    publishedAt: "2026-04-12",
    readMinutes: 7,
    authorName: "Michele Sanna",
    authorRole: "Co-Founder & CPTO, SERSAN",
    authorRoleIt: "Co-Founder & CPTO, SERSAN",
    tags: ["audit", "ai-strategy", "process"],
    body: `## Why most AI audits are theatre

A discovery call in a trench coat. Thirty minutes of qualification questions and a deck full of "AI could help here" platitudes. That is not an audit. That is a sales process pretending to be a deliverable.

## What we actually do

We send a senior engineer into your stack for a week. Read access to repos, dashboards, the data warehouse, the ticketing system. Calendar time with four to eight people across engineering, ops, and leadership.

By the end of the week, you have a 20–30 page written report. Not slides. A document.

## What the report contains

- Executive summary written for both your CEO and your CTO
- What's broken, ranked by business impact, not technical debt
- What's manual, with realistic time-savings estimates
- What AI can actually do inside your product, and what it can't, said honestly
- What we'd build first, scoped, sequenced, with rough effort estimates
- A 90-day roadmap if you wanted to start tomorrow

## You keep it whether you hire us or not

The deliverable is yours. Hand it to your internal team, hand it to another vendor, or sit on it. The roadmap doesn't expire.`,
    bodyIt: `## Perché la maggior parte degli audit AI è teatro

Una call conoscitiva travestita. Trenta minuti di domande di qualificazione e una presentazione piena di banalità del tipo "qui l'AI potrebbe aiutare". Questo non è un audit. È un processo di vendita che si finge un deliverable.

## Cosa facciamo davvero

Mandiamo un ingegnere senior dentro il vostro stack per una settimana. Accesso in lettura a repository, dashboard, data warehouse e sistema di ticketing. Tempo in agenda con quattro-otto persone tra engineering, operations e leadership.

Alla fine della settimana avete un report scritto di 20–30 pagine. Non slide. Un documento.

## Cosa contiene il report

- Un executive summary scritto sia per il vostro CEO sia per il vostro CTO
- Cosa è rotto, ordinato per impatto sul business, non per debito tecnico
- Cosa è manuale, con stime realistiche di tempo risparmiato
- Cosa l'AI può fare davvero dentro il vostro prodotto, e cosa no, detto onestamente
- Cosa costruiremmo per primo, con scope, sequenza e stime di effort di massima
- Una roadmap a 90 giorni, se voleste partire domani

## Resta vostro che ci ingaggiate o meno

Il deliverable è vostro. Datelo al vostro team interno, datelo a un altro fornitore, oppure tenetelo nel cassetto. La roadmap non ha scadenza.`,
  },
  {
    slug: "weekly-scope-not-multi-year-retainers",
    title: "Weekly scope, not multi-year retainers",
    titleIt: "Scope settimanale, non retainer pluriennali",
    excerpt:
      "Why we re-earn the next week of work every week, and why lock-in is a smell, not a feature.",
    excerptIt:
      "Perché ci riguadagniamo la settimana di lavoro successiva ogni settimana, e perché il lock-in è un campanello d'allarme, non una feature.",
    category: "article",
    publishedAt: "2026-03-28",
    readMinutes: 5,
    authorName: "Alessandro Serratt",
    authorRole: "Co-Founder & CEO, SERSAN",
    authorRoleIt: "Co-Founder & CEO, SERSAN",
    tags: ["engagement-model", "pricing"],
    body: `## Lock-in is a smell

The traditional consulting model is built on lock-in. Long contracts, hard-to-quantify deliverables, and a steady hum of "we're working on it" that nobody wants to interrupt.

We don't do that.

## How weekly scope actually works

Every Friday, we send a one-page summary: what landed this week, what we believe ships next, and what we'd cut if you wanted to stop. You can stop. Most clients don't, but the option is real.

## Why this is good for both sides

It forces us to ship something visible every week. It forces the conversation to be about value, not hours. And it keeps the engagement honest in a way that a twelve-month statement of work never can be.`,
    bodyIt: `## Il lock-in è un campanello d'allarme

Il modello di consulenza tradizionale è costruito sul lock-in. Contratti lunghi, deliverable difficili da quantificare e un costante brusio di "ci stiamo lavorando" che nessuno ha voglia di interrompere.

Noi non lo facciamo.

## Come funziona davvero lo scope settimanale

Ogni venerdì inviamo un riepilogo di una pagina: cosa è arrivato questa settimana, cosa crediamo verrà rilasciato dopo e cosa taglieremmo se voleste fermarvi. Potete fermarvi. La maggior parte dei clienti non lo fa, ma l'opzione è reale.

## Perché questo è un bene per entrambe le parti

Ci costringe a rilasciare qualcosa di visibile ogni settimana. Costringe la conversazione a vertere sul valore, non sulle ore. E mantiene l'ingaggio onesto in un modo che uno statement of work a dodici mesi non potrà mai essere.`,
  },
  {
    slug: "production-ai-not-demos",
    title: "Production AI, not demos",
    titleIt: "AI in produzione, non demo",
    excerpt:
      "The gap between a working demo and a system that runs in production at 3am is wider than most teams realise.",
    excerptIt:
      "Il divario tra una demo funzionante e un sistema che gira in produzione alle 3 di notte è più ampio di quanto la maggior parte dei team immagini.",
    category: "guide",
    publishedAt: "2026-02-14",
    readMinutes: 9,
    authorName: "Michele Sanna",
    authorRole: "Co-Founder & CPTO, SERSAN",
    authorRoleIt: "Co-Founder & CPTO, SERSAN",
    tags: ["mlops", "production", "ai-engineering"],
    body: `## The demo is the easy part

A working demo on a senior engineer's laptop is one or two days of work. A system that handles a hundred thousand requests a day at p99 latency, fails gracefully, gets observed, gets rolled back, and obeys whatever regulatory regime sits over your industry. That is months.

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
