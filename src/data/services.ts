/**
 * Service detail page content.
 *
 * One entry per service. The shape feeds /src/components/sections/
 * service-detail.tsx which renders the page template, and the four
 * /app/services/<slug>/page.tsx route files which just pull the right
 * slug + render the template.
 *
 * caseStudyIds reference src/data/case-studies.ts. The detail page
 * surfaces a filtered grid of the most relevant real engagements
 * (no invented proof — only real names from the existing data set).
 *
 * Durations and the no-internal-team promise come from src/data/copy.ts so
 * they cannot drift from /audit, /consulting and the homepage.
 */

import { FACTS, POSITIONING } from "@/data/copy";

export interface ServiceFaq {
  q: string;
  qIt: string;
  a: string;
  aIt: string;
}

export interface ServiceBuild {
  title: string;
  titleIt: string;
  detail: string;
  detailIt: string;
}

export interface ServiceUseCase {
  title: string;
  titleIt: string;
  detail: string;
  detailIt: string;
}

export interface ServiceDeliverable {
  text: string;
  textIt: string;
}

export interface ServiceContent {
  slug: "engineering" | "automation" | "mlops" | "architecture";
  /** Order index used for sequential numbering (01/02/03/04). */
  number: string;
  name: string;
  nameIt: string;
  /** Pithy positioning line — appears under the hero headline. */
  positioning: string;
  positioningIt: string;
  /** Page-level meta description (also used as the hero subhead). */
  description: string;
  descriptionIt: string;
  problem: {
    eyebrow: string;
    eyebrowIt: string;
    title: string;
    titleIt: string;
    body: string;
    bodyIt: string;
  };
  builds: ServiceBuild[];
  useCases: ServiceUseCase[];
  /** Concrete artefacts handed over at the end of an engagement. */
  deliverables: ServiceDeliverable[];
  /** Case study slugs (from src/data/case-studies.ts) that exemplify
   *  this service. Surfaces a real, named, filtered work grid. */
  caseStudyIds: string[];
  /** Typical timeline phrasing for the CTA copy. */
  timeline: string;
  timelineIt: string;
  faqs: ServiceFaq[];
}

export const services: ServiceContent[] = [
  // ============================================================
  // 01 — Custom Software & AI Products
  // ============================================================
  {
    slug: "engineering",
    number: "01",
    name: "Custom Software & AI Products",
    nameIt: "Software su Misura & Prodotti AI",
    positioning: "Custom software built around how your business works.",
    positioningIt: "Software su misura, costruito su come lavorate davvero.",
    description:
      "From internal tools and customer portals to AI-powered products, we design and ship custom software when off-the-shelf tools no longer fit. Management systems, dashboards, web apps, APIs and integrations — built properly, sized to the problem, and handed over as something you own.",
    descriptionIt:
      "Dagli strumenti interni ai portali per i clienti fino ai prodotti basati su AI: progettiamo e realizziamo software su misura quando le soluzioni pronte non bastano più. Gestionali, dashboard, applicazioni web, API e integrazioni — costruiti bene, dimensionati sul problema e consegnati come qualcosa che è vostro.",
    problem: {
      eyebrow: "What goes wrong with business software",
      eyebrowIt: "Cosa va storto con il software aziendale",
      title: "Most businesses outgrow their tools long before they replace them.",
      titleIt: "La maggior parte delle aziende supera i propri strumenti molto prima di sostituirli.",
      body: "The spreadsheet becomes a process. The process becomes the business. Then it starts costing hours, causing errors and blocking growth — and the off-the-shelf tool everyone uses can't be bent any further. Custom software is worth building at exactly that point: when the way you work is a real advantage and no product on the market fits it. Sometimes that includes AI. Often the first version doesn't need any.",
      bodyIt: "Il foglio di calcolo diventa un processo. Il processo diventa l'azienda. E a un certo punto costa ore, genera errori e blocca la crescita, mentre lo strumento pronto che usano tutti non si piega oltre. Il software su misura vale esattamente da lì: quando il vostro modo di lavorare è un vantaggio reale e nessun prodotto sul mercato lo copre. A volte serve anche l'AI. Spesso la prima versione non ne ha bisogno.",
    },
    builds: [
      {
        title: "Product engineering: frontend, backend, infra",
        titleIt: "Ingegneria di prodotto: frontend, backend, infrastruttura",
        detail:
          "Web apps, internal tools, portals, dashboards and APIs. Typed services in TypeScript / Python / Go, database design, deploy pipelines. The non-AI 70% of a system that has to be right first.",
        detailIt:
          "Applicazioni web, strumenti interni, portali, dashboard e API. Servizi tipizzati in TypeScript / Python / Go, progettazione del database, pipeline di deploy. Il 70% non-AI di un sistema, quello che deve essere giusto per primo.",
      },
      {
        title: "AI features, added only where they earn it",
        titleIt: "Funzionalità AI, solo dove se lo meritano",
        detail:
          "Copilots, retrieval, classification and agents, written as typed modules with retry, timeout, cost ceilings and structured logging. And left out entirely when plain software does the job better.",
        detailIt:
          "Copilot, retrieval, classificazione e agenti, scritti come moduli tipizzati con retry, timeout, tetti di costo e logging strutturato. E lasciati fuori del tutto quando un software normale fa meglio il lavoro.",
      },
      {
        title: "Eval harness alongside the integration tests",
        titleIt: "Eval harness accanto ai test di integrazione",
        detail:
          "Versioned regression cases for AI behaviour, run in CI alongside the rest of the test suite. Same pipeline that catches a broken endpoint catches a broken prompt.",
        detailIt:
          "Casi di regressione versionati per il comportamento dell'AI, eseguiti in CI insieme al resto della test suite. La stessa pipeline che intercetta un endpoint rotto intercetta un prompt rotto.",
      },
      {
        title: "Tracing from user click to model output to action",
        titleIt: "Tracing dal click dell'utente all'output del modello all'azione",
        detail:
          "OpenTelemetry spans for the whole request: frontend submit, backend handler, retrieval, model call, tool execution, response. When something breaks you read a trace, not archaeology.",
        detailIt:
          "Span OpenTelemetry per l'intera richiesta: submit del frontend, handler del backend, retrieval, chiamata al modello, esecuzione dei tool, risposta. Quando qualcosa si rompe si legge una trace, non archeologia.",
      },
      {
        title: "Handover: documentation, training, optional support",
        titleIt: "Handover: documentazione, formazione, supporto opzionale",
        detail:
          POSITIONING.noTeamNeeded.en +
          " We leave owner and admin documentation, train whoever runs it day to day, brief your developers when you have them, and can stay on for support after launch.",
        detailIt:
          POSITIONING.noTeamNeeded.it +
          " Lasciamo documentazione per chi amministra e per chi usa il sistema, formiamo chi lo gestisce ogni giorno, facciamo il passaggio ai vostri sviluppatori quando ci sono e possiamo restare a supporto dopo il lancio.",
      },
    ],
    useCases: [
      {
        title: "A process has outgrown its spreadsheets",
        titleIt: "Un processo ha superato i fogli di calcolo",
        detail:
          "The work happens across spreadsheets, email threads and a tool that was never meant for it. It holds until it has to scale, and every new person makes it worse. We replace it with software shaped around the process.",
        detailIt:
          "Il lavoro vive tra fogli di calcolo, catene di email e uno strumento nato per altro. Regge finché non deve scalare, e ogni persona in più peggiora le cose. Lo sostituiamo con un software disegnato sul processo.",
      },
      {
        title: "A new product, portal or internal system",
        titleIt: "Un nuovo prodotto, portale o gestionale",
        detail:
          "A customer portal, a booking or management system, an academy or LMS platform, an internal operations tool, a full SaaS product. We design it, build it and ship it, with AI inside only where it makes the product better.",
        detailIt:
          "Un portale clienti, un sistema di prenotazione o gestione, una piattaforma academy o LMS, uno strumento operativo interno, un prodotto SaaS completo. Lo progettiamo, lo costruiamo e lo rilasciamo, con l'AI dentro solo dove migliora il prodotto.",
      },
      {
        title: "Extending software you already have",
        titleIt: "Estendere un software che avete già",
        detail:
          "You have a working system and need new functionality, an AI feature, an integration, or simply for it to stop breaking. Tight scope, real integration, no rewrite unless a rewrite is genuinely cheaper.",
        detailIt:
          "Avete un sistema che funziona e vi serve una nuova funzionalità, una feature AI, un'integrazione o semplicemente che smetta di rompersi. Scope ristretto, integrazione reale, nessuna riscrittura se non conviene davvero.",
      },
    ],
    deliverables: [
      { text: "Production code in your repository, owned by your team", textIt: "Codice di produzione nel vostro repository, di proprietà del vostro team" },
      { text: "Eval harness for any AI feature, run in CI", textIt: "Eval harness per ogni funzionalità AI, eseguita in CI" },
      { text: "Structured tracing, OpenTelemetry-compatible", textIt: "Tracing strutturato, compatibile OpenTelemetry" },
      { text: "Typed AI integration modules (model calls, retrieval, tools)", textIt: "Moduli di integrazione AI tipizzati (chiamate ai modelli, retrieval, tool)" },
      { text: "Deploy pipeline + monitoring + rollback path", textIt: "Pipeline di deploy + monitoring + percorso di rollback" },
      { text: "Runbook, owner training + admin documentation", textIt: "Runbook, formazione per l'owner + documentazione admin" },
    ],
    caseStudyIds: ["spherenode", "quantex", "revolut"],
    timeline: `${FACTS.sprintDuration.en} · fixed fee per phase`,
    timelineIt: `${FACTS.sprintDuration.it} · compenso fisso per fase`,
    faqs: [
      {
        q: "Do you build on top of LangChain / LlamaIndex / framework X?",
        qIt: "Costruite sopra LangChain / LlamaIndex / framework X?",
        a: "Sometimes. We pick the framework by what the project actually needs. For tight production loops we often skip frameworks entirely and write the orchestration directly. Fewer abstractions to debug when something goes wrong.",
        aIt: "A volte. Scegliamo il framework in base a ciò di cui il progetto ha realmente bisogno. Per loop di produzione serrati spesso saltiamo del tutto i framework e scriviamo l'orchestrazione direttamente. Meno astrazioni da debuggare quando qualcosa va storto.",
      },
      {
        q: "What about open-source models vs OpenAI / Anthropic?",
        qIt: "E i modelli open-source rispetto a OpenAI / Anthropic?",
        a: "Both. The model is a choice driven by latency, cost, data residency, and the task, not by ideology. We routinely ship hybrid systems where a small local model handles classification and a frontier model handles reasoning.",
        aIt: "Entrambi. Il modello è una scelta guidata da latenza, costo, data residency e dal task, non dall'ideologia. Rilasciamo abitualmente sistemi ibridi in cui un piccolo modello locale gestisce la classificazione e un modello di frontiera gestisce il reasoning.",
      },
      {
        q: "How do you handle evals?",
        qIt: "Come gestite le eval?",
        a: "Versioned test cases checked into the repo. Each case is a specific input, an expected behaviour, and a grader (string match, LLM-as-judge, or human review queue). Day-zero baseline. Weekly drift run in CI. Page on regression.",
        aIt: "Casi di test versionati e committati nel repo. Ogni caso è un input specifico, un comportamento atteso e un grader (string match, LLM-as-judge o coda di revisione umana). Baseline al day zero. Run settimanale sul drift in CI. Alert in caso di regressione.",
      },
      {
        q: "Can you start from a prototype we already have?",
        qIt: "Potete partire da un prototipo che abbiamo già?",
        a: "Yes. The Diagnose phase reviews what's there, what's salvageable, and what should be rebuilt. Usually it's a mix.",
        aIt: "Sì. La fase di Diagnosi esamina cosa c'è, cosa è recuperabile e cosa va ricostruito. Di solito è un mix.",
      },
      {
        q: "Is this just web development?",
        qIt: "È solo sviluppo web?",
        a: "It's product engineering. Web + mobile + backend + infrastructure + the AI layer that sits inside it. About 70% of a production AI system is non-AI software that has to be right.",
        aIt: "È ingegneria di prodotto. Web + mobile + backend + infrastruttura + il layer di AI che vi risiede dentro. Circa il 70% di un sistema AI in produzione è software non-AI che deve essere corretto.",
      },
    ],
  },

  // ============================================================
  // 02 — Workflow Automation
  // ============================================================
  {
    slug: "automation",
    number: "02",
    name: "Workflow Automation",
    nameIt: "Automazione dei Processi",
    positioning: "Automate the work nobody should still do by hand.",
    positioningIt: "Automatizzate il lavoro che nessuno dovrebbe più fare a mano.",
    description:
      "Automate the work your team should not still be doing manually. We connect the systems you already use, build the small internal tools that are missing, and use AI only where judgement is genuinely required.",
    descriptionIt:
      "Automatizzate il lavoro che il vostro team non dovrebbe più fare a mano. Colleghiamo i sistemi che già usate, costruiamo i piccoli strumenti interni che mancano e usiamo l'AI solo dove serve davvero del giudizio.",
    problem: {
      eyebrow: "What goes wrong with automation",
      eyebrowIt: "Cosa va storto con l'automazione",
      title: "In most businesses, the work worth automating is still done by hand.",
      titleIt: "Nella maggior parte delle aziende il lavoro che varrebbe automatizzare si fa ancora a mano.",
      body: "Not because nobody thought of it — the obvious tools stop right where the work gets hard. So somebody re-types the same data into three systems, chases approvals by email, and rebuilds the same report every Monday. Or the opposite happened: years of Zaps and scenarios nobody can map, quietly dropping work when a field changes.",
      bodyIt: "Non perché nessuno ci abbia pensato: gli strumenti ovvi si fermano proprio dove il lavoro si complica. Così qualcuno ridigita gli stessi dati in tre sistemi, insegue le approvazioni via email e rifà lo stesso report ogni lunedì. Oppure è successo il contrario: anni di Zap e scenari che nessuno sa mappare, che perdono lavoro quando cambia un campo.",
    },
    builds: [
      {
        title: "Rule-based first, where software is enough",
        titleIt: "Prima le regole, dove basta il software",
        detail:
          "If the step is deterministic, we write deterministic code: no model, no token cost, no uncertainty. Lightweight workflow code in the stack you already have, not a heavyweight platform. Most of a good automation is exactly this.",
        detailIt:
          "Se lo step è deterministico, scriviamo codice deterministico: niente modello, niente costo in token, niente incertezza. Codice di workflow leggero nello stack che avete già, non una piattaforma pesante. La maggior parte di una buona automazione è esattamente questo.",
      },
      {
        title: "AI-assisted where judgement is required",
        titleIt: "AI dove serve del giudizio",
        detail:
          "Classification, extraction, summarisation, reasoning over messy input: the steps rules can't do. Model calls are wrapped in retry, cost budgeting and a fallback to a human queue when confidence is low.",
        detailIt:
          "Classificazione, estrazione, sintesi, ragionamento su input disordinati: gli step che le regole non sanno fare. Le chiamate ai modelli sono avvolte in retry, budget di costo e un fallback verso una coda umana quando la confidenza è bassa.",
      },
      {
        title: "Human-controlled where mistakes matter",
        titleIt: "Sotto controllo umano dove l'errore pesa",
        detail:
          "Not every step needs review. We map which decisions can run autonomously and which need a human checkbox, by impact, by reversibility, by regulator.",
        detailIt:
          "Non ogni step richiede revisione. Mappiamo quali decisioni possono procedere in autonomia e quali richiedono un via libera umano, per impatto, per reversibilità, per regolatore.",
      },
      {
        title: "Work never silently disappears",
        titleIt: "Il lavoro non sparisce mai in silenzio",
        detail:
          "When an automation fails, nothing vanishes. Every step has a defined failure behaviour, and anything that can't complete is captured, surfaced and safely retried — a dead-letter queue your team can inspect, replay or escalate.",
        detailIt:
          "Quando un'automazione fallisce, non si perde nulla. Ogni step ha un comportamento di guasto definito e ciò che non riesce a completarsi viene catturato, mostrato e rieseguito in sicurezza: una dead-letter queue che potete ispezionare, rieseguire o escalare.",
      },
      {
        title: "Yours to run, and the costs are visible",
        titleIt: "Vostro da gestire, con i costi sempre visibili",
        detail:
          "You own the code. We document how it works, train whoever will look after it, and show running cost per workflow and per step so the monthly invoice never surprises you. No internal engineering team required.",
        detailIt:
          "Il codice è vostro. Documentiamo come funziona, formiamo chi se ne occuperà e mostriamo il costo di esecuzione per processo e per step, così la fattura mensile non vi sorprende. Non serve un team tecnico interno.",
      },
    ],
    useCases: [
      {
        title: "Repetitive work eating your team's time",
        titleIt: "Lavoro ripetitivo che divora il tempo",
        detail:
          "Lead intake and qualification, CRM updates, onboarding steps, internal approvals, scheduling and notifications, the report someone rebuilds every week. We start with one workflow, prove the saving, then expand.",
        detailIt:
          "Raccolta e qualifica dei lead, aggiornamenti al CRM, step di onboarding, approvazioni interne, scheduling e notifiche, il report che qualcuno rifà ogni settimana. Partiamo da un processo, dimostriamo il risparmio, poi si allarga.",
      },
      {
        title: "Tools that don't talk to each other",
        titleIt: "Strumenti che non si parlano davvero",
        detail:
          "Your CRM, your inbox, your spreadsheets and your billing tool each hold part of the truth, and someone re-types between them. We connect them properly, or build the small internal tool that should sit in the middle.",
        detailIt:
          "Il CRM, la posta, i fogli di calcolo e la fatturazione contengono ognuno un pezzo di verità, e qualcuno ricopia da uno all'altro. Li colleghiamo come si deve, oppure costruiamo il piccolo strumento interno che dovrebbe stare in mezzo.",
      },
      {
        title: "Documents, emails and human judgement",
        titleIt: "Documenti, email e giudizio umano",
        detail:
          "Invoices, contracts, applications or inbound requests that need reading, routing or enriching. The model reads, rules route, a person approves anything that matters — and every step leaves an audit trail.",
        detailIt:
          "Fatture, contratti, candidature o richieste in arrivo da leggere, instradare o arricchire. Il modello legge, le regole instradano, una persona approva ciò che conta — e ogni step lascia una traccia verificabile.",
      },
    ],
    deliverables: [
      { text: "Automation code in your repository, owned by you", textIt: "Codice dell'automazione nel vostro repository, vostro" },
      { text: "Per-step retry / rollback / dead-letter routing", textIt: "Routing per step di retry / rollback / dead-letter" },
      { text: "Cost dashboard + budget alerts", textIt: "Dashboard dei costi + alert di budget" },
      { text: "Human-review queue with audit log", textIt: "Coda di revisione umana con audit log" },
      { text: "Workflow map, documentation + owner training", textIt: "Mappa dei processi, documentazione + formazione" },
      { text: "Optional: 30-day stabilisation window post-launch", textIt: "Opzionale: finestra di stabilizzazione di 30 giorni post-lancio" },
    ],
    caseStudyIds: ["terra-noa", "regione-sardegna", "apple-uk"],
    timeline: "Days to weeks per workflow · fixed scope",
    timelineIt: "Da giorni a settimane per processo · scope fisso",
    faqs: [
      {
        q: "Do you replace Zapier or work alongside it?",
        qIt: "Sostituite Zapier o lavorate al suo fianco?",
        a: "Both, depending on volume and reliability requirements. Low-volume, low-stakes flows can stay in Zapier. Anything tied to revenue, compliance or customers moves to owned code — and we migrate workflow-by-workflow, never big-bang.",
        aIt: "Entrambi, a seconda del volume e dei requisiti di affidabilità. I flussi a basso volume e bassa criticità possono restare in Zapier. Tutto ciò che è legato a fatturato, compliance o clienti passa a codice di proprietà, e migriamo workflow per workflow, mai in modalità big-bang.",
      },
      {
        q: "How small can a first automation be?",
        qIt: "Quanto può essere piccola una prima automazione?",
        a: "Small. A useful automation doesn't need to become a six-month transformation programme. Many start with one workflow, prove the saving, then expand. Even a screen recording of how you do it today is enough to start.",
        aIt: "Piccola. Un'automazione utile non deve diventare un programma di trasformazione da sei mesi. Molte partono da un processo, dimostrano il risparmio, poi si allargano. Basta anche una registrazione dello schermo di come lo fate oggi per iniziare.",
      },
      {
        q: "How do you handle LLM cost when volume spikes?",
        qIt: "Come gestite il costo degli LLM quando i volumi schizzano?",
        a: "Per-workflow budget caps at the orchestrator. Per-step model fallback (frontier → smaller → cached). Pre-deploy load testing with cost projections. Production alerts at 70% of monthly budget.",
        aIt: "Tetti di budget per workflow a livello di orchestratore. Fallback del modello per step (frontiera → più piccolo → cache). Load testing pre-deploy con proiezioni di costo. Alert in produzione al 70% del budget mensile.",
      },
      {
        q: "What if a step needs to wait for a human?",
        qIt: "E se uno step deve attendere un intervento umano?",
        a: "We model human steps as first-class workflow steps with their own timeout, escalation, and reminder behaviour. Slack, email, or in-app, whatever your team already lives in.",
        aIt: "Modelliamo gli step umani come step di workflow di prima classe, con un proprio comportamento di timeout, escalation e reminder. Slack, email o in-app, qualunque strumento il vostro team già utilizzi.",
      },
    ],
  },

  // ============================================================
  // 03 — AI Reliability & MLOps
  // ============================================================
  {
    slug: "mlops",
    number: "03",
    name: "AI Reliability & MLOps",
    nameIt: "Affidabilità AI & MLOps",
    positioning: "Make AI features reliable enough to depend on.",
    positioningIt: "Rendere le funzionalità AI affidabili davvero.",
    description:
      "The AI feature works sometimes, but nobody can trust it yet. We add evaluation, monitoring, deployment and rollback to copilots, RAG systems, agents and production models.",
    descriptionIt:
      "La funzionalità AI a volte funziona, ma nessuno riesce ancora a fidarsi. Aggiungiamo valutazione, monitoring, deployment e rollback a copilot, sistemi RAG, agenti e modelli in produzione.",
    problem: {
      eyebrow: "What goes wrong with AI in production",
      eyebrowIt: "Cosa va storto con l'AI in produzione",
      title: "An AI feature your team can't trust is a feature your team quietly stops using.",
      titleIt: "Una funzionalità AI di cui il team non si fida è una funzionalità che il team smette di usare.",
      body: "It works in the demo. In production it's right most of the time, wrong occasionally, and nobody can say which. Costs drift, latency spikes on the worst possible day, and no test would have caught it. The fix is rarely a better model — it's measurement, and being able to roll back in a minute.",
      bodyIt: "Nella demo funziona. In produzione ha ragione quasi sempre, a volte no, e nessuno sa dire quando. I costi si spostano, la latenza schizza nel giorno peggiore e nessun test l'avrebbe intercettato. La soluzione raramente è un modello migliore: è misurare, e poter tornare indietro in un minuto.",
    },
    builds: [
      {
        title: "Evaluation suite: regression + drift + safety",
        titleIt: "Suite di valutazione: regressione + drift + safety",
        detail:
          "A written definition of what 'good' means for this feature, turned into test cases anyone can re-run. Drift metrics on production inputs, safety checks on sensitive outputs, run in CI on every change.",
        detailIt:
          "Una definizione scritta di cosa significa «funziona bene» per questa funzionalità, tradotta in casi di test rieseguibili da chiunque. Metriche di drift sugli input di produzione, controlli di safety sugli output sensibili, in CI a ogni modifica.",
      },
      {
        title: "Deployment pipeline + model registry",
        titleIt: "Pipeline di deployment + model registry",
        detail:
          "Versioned model artefacts in a registry. Promotion from staging → canary → production gated by eval pass. Rollback to any prior version in one command.",
        detailIt:
          "Artefatti dei modelli versionati in un registry. Promozione da staging → canary → produzione vincolata al superamento delle eval. Rollback a qualsiasi versione precedente con un solo comando.",
      },
      {
        title: "Monitoring: latency, cost, accuracy",
        titleIt: "Monitoring: latenza, costo, accuratezza",
        detail:
          "Per-model dashboards covering inference latency p50/p95/p99, cost per prediction, ground-truth accuracy where it's measurable. Threshold-based alerting that pages the team before users notice.",
        detailIt:
          "Dashboard per modello che coprono la latenza di inferenza p50/p95/p99, il costo per predizione e l'accuratezza rispetto al ground truth dove è misurabile. Alerting basato su soglie che avvisa il team prima che se ne accorgano gli utenti.",
      },
      {
        title: "Shadow / canary / rollback paths",
        titleIt: "Percorsi shadow / canary / rollback",
        detail:
          "New models run in shadow against production traffic first. Then a single-digit-percent canary. Then full rollout. Each gate has a kill switch.",
        detailIt:
          "I nuovi modelli vengono prima eseguiti in shadow sul traffico di produzione. Poi un canary a una sola cifra percentuale. Poi il rollout completo. Ogni gate ha un kill switch.",
      },
      {
        title: "Retraining triggers and ownership",
        titleIt: "Trigger di retraining e ownership",
        detail:
          "When drift exceeds threshold, the pipeline opens a retraining ticket, not an outage. A named owner approves the retraining run and the redeployment — someone on your side, or us under a support arrangement.",
        detailIt:
          "Quando il drift supera la soglia, la pipeline apre un ticket di retraining, non un disservizio. Un owner designato approva la run di retraining e il nuovo deployment: qualcuno da parte vostra, oppure noi con un accordo di supporto.",
      },
    ],
    useCases: [
      {
        title: "An AI feature that works inconsistently",
        titleIt: "Una funzionalità AI poco affidabile",
        detail:
          "It's right most of the time and wrong often enough that nobody relies on it. We define what good looks like, build the eval set that proves it, and harden the feature until the team trusts the output.",
        detailIt:
          "Ha ragione quasi sempre e sbaglia abbastanza spesso da non poterci contare. Definiamo cosa significa «giusto», costruiamo il set di eval che lo dimostra e irrobustiamo la funzionalità finché il team si fida.",
      },
      {
        title: "AI cost or latency is unpredictable",
        titleIt: "Costi o latenza dell'AI imprevedibili",
        detail:
          "The invoice moves without explanation and the slowest requests are the ones customers notice. We instrument cost per call and latency per step, set budgets and fallbacks, and make the trade-offs visible.",
        detailIt:
          "La fattura si muove senza spiegazioni e le richieste più lente sono proprio quelle che i clienti notano. Strumentiamo costo per chiamata e latenza per step, impostiamo budget e fallback e rendiamo visibili i compromessi.",
      },
      {
        title: "Production ML that needs governance",
        titleIt: "ML in produzione che richiede governance",
        detail:
          "Auditable pipelines, traceable training data, model cards, and the documentation a regulator actually wants to see. The compliance work is design, not paperwork bolted on at the end.",
        detailIt:
          "Pipeline auditabili, dati di training tracciabili, model card e la documentazione che un regolatore vuole davvero vedere. Il lavoro di compliance è progettazione, non scartoffie incollate alla fine.",
      },
    ],
    deliverables: [
      { text: "Eval suite with documented test cases", textIt: "Suite di eval con casi di test documentati" },
      { text: "Model registry + promotion pipeline", textIt: "Model registry + pipeline di promozione" },
      { text: "Monitoring dashboards + alerting rules", textIt: "Dashboard di monitoring + regole di alerting" },
      { text: "Shadow / canary / rollback infrastructure", textIt: "Infrastruttura shadow / canary / rollback" },
      { text: "Retraining playbook + named-owner handover", textIt: "Playbook di retraining + handover a un owner designato" },
      { text: "Optional: 60-day period where we operate it with you", textIt: "Opzionale: 60 giorni in cui lo gestiamo insieme a voi" },
    ],
    caseStudyIds: ["revolut", "jp-morgan", "pharma-deloitte", "apple-uk", "who"],
    timeline: "Review, hardening sprint or ongoing · fixed scope",
    timelineIt: "Review, sprint di hardening o continuativo · scope fisso",
    faqs: [
      {
        q: "Do you work with our cloud / our ML platform?",
        qIt: "Lavorate con il nostro cloud / la nostra piattaforma ML?",
        a: "Yes. We work with AWS SageMaker, Vertex AI, Databricks, Azure ML, and bare-metal setups. We don't push a particular platform. We work inside what you've already chosen.",
        aIt: "Sì. Lavoriamo con AWS SageMaker, Vertex AI, Databricks, Azure ML e setup bare-metal. Non spingiamo una piattaforma particolare. Lavoriamo all'interno di ciò che avete già scelto.",
      },
      {
        q: "What about LLM-as-a-service models vs trained-in-house?",
        qIt: "E i modelli LLM-as-a-service rispetto a quelli addestrati internamente?",
        a: "Both are MLOps problems. Hosted LLMs need eval, monitoring, cost guardrails, and rollback to a previous prompt version. In-house models need all of that plus the training pipeline. Same engineering discipline, different surface area.",
        aIt: "Entrambi sono problemi di MLOps. Gli LLM ospitati hanno bisogno di eval, monitoring, guardrail sui costi e rollback a una versione precedente del prompt. I modelli interni hanno bisogno di tutto questo più la pipeline di training. Stessa disciplina ingegneristica, superficie diversa.",
      },
      {
        q: "How do you handle evals when ground truth is hard to get?",
        qIt: "Come gestite le eval quando il ground truth è difficile da ottenere?",
        a: "Layered approach: synthetic test cases for the easy 60%, LLM-as-judge for the next 30%, human review queues for the last 10%. We measure inter-rater agreement on the human layer and treat the judge model as something that itself needs evals.",
        aIt: "Approccio a strati: casi di test sintetici per il 60% facile, LLM-as-judge per il successivo 30%, code di revisione umana per l'ultimo 10%. Misuriamo l'accordo inter-rater sullo strato umano e trattiamo il modello giudice come qualcosa che a sua volta necessita di eval.",
      },
      {
        q: "Can you take an existing model into production without retraining?",
        qIt: "Potete portare in produzione un modello esistente senza riaddestrarlo?",
        a: "Usually yes. About a third of this work is 'this model works, get it operable'. We wrap it with eval, monitoring, rollback and a deployment story, without touching the training code. That can be a focused hardening sprint, part of a larger build, or an independent review.",
        aIt: "Di solito sì. Circa un terzo di questo lavoro è del tipo «questo modello funziona, rendetelo operabile». Lo avvolgiamo con eval, monitoring, rollback e una storia di deployment, senza toccare il codice di training. Può essere uno sprint mirato di hardening, parte di un progetto più ampio o una review indipendente.",
      },
    ],
  },

  // ============================================================
  // 04 — Technical Audits & Architecture
  // ============================================================
  {
    slug: "architecture",
    number: "04",
    name: "Technical Audits & Architecture",
    nameIt: "Audit Tecnici & Architettura",
    positioning: "Find what should not be built, before code becomes debt.",
    positioningIt: "Individuare ciò che non andrebbe costruito, prima che il codice diventi debito.",
    description:
      "A short, senior review of what you have and what you're about to build: what to build, what to buy, what to leave alone. You leave with a written recommendation you can act on, with us or without us.",
    descriptionIt:
      "Una revisione senior e breve di ciò che avete e di ciò che state per costruire: cosa costruire, cosa comprare, cosa lasciar stare. Uscite con una raccomandazione scritta su cui potete agire, con noi o senza di noi.",
    problem: {
      eyebrow: "What goes wrong before the build",
      eyebrowIt: "Cosa va storto prima di costruire",
      title: "Most of the money lost on software is spent building the wrong thing, well.",
      titleIt: "Gran parte dei soldi persi nel software si spende per costruire bene la cosa sbagliata.",
      body: "Projects rarely fail at execution. They fail at the decision before it: the wrong tool was bought, the integration plan was optimistic, the data wasn't where everyone assumed, or the thing being automated wasn't the expensive part. Two months in, the team is committed to a path that should have been stopped in scoping. A few days of senior review beforehand is the cheapest work in the whole project.",
      bodyIt: "I progetti raramente falliscono nell'esecuzione. Falliscono nella decisione che viene prima: si è comprato lo strumento sbagliato, il piano di integrazione era ottimista, i dati non erano dove tutti pensavano, oppure la cosa automatizzata non era quella costosa. Due mesi dopo il team è impegnato su un percorso che andava fermato in fase di scoping. Qualche giorno di revisione senior prima è il lavoro più economico dell'intero progetto.",
    },
    builds: [
      {
        title: "Two scopes: focused diagnostic or full audit",
        titleIt: "Due scope: diagnosi mirata o audit completo",
        detail:
          "A focused diagnostic looks at one workflow, product problem, automation opportunity or system. A full technical audit looks at the broader architecture, workflows, data, tooling and delivery environment. Same method, different surface — you pick the scope before we start.",
        detailIt:
          "Una diagnosi mirata guarda un processo, un problema di prodotto, un'opportunità di automazione o un singolo sistema. Un audit tecnico completo guarda architettura, processi, dati, strumenti e ambiente di delivery nel loro insieme. Stesso metodo, superficie diversa: lo scope si sceglie prima di iniziare.",
      },
      {
        title: "Build vs. buy vs. don't-build recommendation",
        titleIt: "Raccomandazione build vs. buy vs. non costruire",
        detail:
          "For each piece of the proposed system: ship it, license it, or kill it. With reasoning, costs, and a sequencing plan.",
        detailIt:
          "Per ogni componente del sistema proposto: realizzarlo, acquistarlo in licenza o eliminarlo. Con motivazioni, costi e un piano di sequenziamento.",
      },
      {
        title: "Reference architecture + sequencing plan",
        titleIt: "Architettura di riferimento + piano di sequenziamento",
        detail:
          "If the recommendation is 'build', the architecture comes with it. Component-level breakdown, data flow, failure modes, deployment order, and the minimum viable first phase.",
        detailIt:
          "Se la raccomandazione è «costruire», l'architettura arriva con essa. Scomposizione a livello di componente, flusso dei dati, modalità di guasto, ordine di deployment e la prima fase minima viable.",
      },
      {
        title: "Risk register: technical and regulatory",
        titleIt: "Registro dei rischi: tecnici e regolatori",
        detail:
          "Documented risks with severity, likelihood and mitigation. Where regulation applies — EU AI Act, DORA, sector rules — the posture is stated explicitly, not waved at. Where it doesn't, we don't invent overhead.",
        detailIt:
          "Rischi documentati con severità, probabilità e mitigazione. Dove la normativa si applica — EU AI Act, DORA, regole di settore — la postura è dichiarata esplicitamente, non accennata. Dove non si applica, non inventiamo overhead.",
      },
      {
        title: "Optional follow-on build engagement",
        titleIt: "Eventuale ingaggio di build successivo",
        detail:
          "If you decide to build, we can. Audit fee credits against the build engagement. About a third of audits end in 'don't build this', and that's a successful outcome.",
        detailIt:
          "Se decidete di costruire, possiamo farlo noi. Il compenso dell'audit viene scontato dall'ingaggio di build. Circa un terzo degli audit si conclude con un «non costruitelo», ed è un esito di successo.",
      },
    ],
    useCases: [
      {
        title: "Before you commit to building",
        titleIt: "Prima di impegnarvi a costruire",
        detail:
          "You're about to spend real money and real months on a build. We do the architecture and the honest arithmetic first, and tell you which parts are worth it.",
        detailIt:
          "State per spendere soldi veri e mesi veri su un progetto. Facciamo prima l'architettura e i conti onesti, e vi diciamo quali parti valgono la pena.",
      },
      {
        title: "You're not sure where AI would help",
        titleIt: "Non sapete dove l'AI possa servire",
        detail:
          "You know something should improve but not what to build. We look at the workflows, name the opportunities that pay back, and say plainly where AI is the wrong answer and ordinary software is better.",
        detailIt:
          "Sapete che qualcosa deve migliorare ma non cosa costruire. Guardiamo i processi, nominiamo le opportunità che si ripagano e diciamo chiaramente dove l'AI è la risposta sbagliata e un software normale fa meglio.",
      },
      {
        title: "Software you inherited or didn't build",
        titleIt: "Software ereditato o costruito da altri",
        detail:
          "You took over a system you didn't design, or you need an honest readiness check before a board meeting, a customer commitment or an audit. We tell you what you actually have, what's at risk, and what to do first.",
        detailIt:
          "Avete ereditato un sistema che non avete progettato, oppure vi serve una verifica onesta di prontezza prima di un consiglio, di un impegno con un cliente o di un audit. Vi diciamo cosa avete davvero, cosa è a rischio e cosa fare per primo.",
      },
      {
        title: "Choosing a vendor or a platform",
        titleIt: "Scegliere un fornitore o una piattaforma",
        detail:
          "You're evaluating tools or suppliers and every demo looks the same. We give you the technical questions to ask, and we score the answers.",
        detailIt:
          "State valutando strumenti o fornitori e ogni demo si assomiglia. Vi forniamo le domande tecniche da porre e valutiamo le risposte.",
      },
    ],
    deliverables: [
      { text: "Written recommendation, sized to scope, never a deck", textIt: "Raccomandazione scritta, mai una presentazione" },
      { text: "Risk register with severities + mitigation", textIt: "Registro dei rischi con severità + mitigazione" },
      { text: "Build vs. buy vs. don't-build recommendation per component", textIt: "Raccomandazione build vs. buy vs. non costruire per ogni componente" },
      { text: "Reference architecture diagrams + sequencing plan", textIt: "Diagrammi di architettura di riferimento + piano di sequenziamento" },
      { text: "60-min walkthrough call, in plain language", textIt: "Call di walkthrough di 60 min, in linguaggio chiaro" },
      { text: "Optional: credit toward a follow-on build engagement", textIt: "Opzionale: credito a valere su un successivo ingaggio di build" },
    ],
    caseStudyIds: ["leonardo", "stealth-greentech", "salvatori", "regione-sardegna"],
    timeline: FACTS.auditDurationScoped.en,
    timelineIt: FACTS.auditDurationScoped.it,
    faqs: [
      {
        q: "What's the difference between this and a consultant's strategy deck?",
        qIt: "Qual è la differenza tra questo e lo strategy deck di un consulente?",
        a: "We don't ship strategy decks. We ship architecture documents an engineer can implement and a risk register a compliance team can defend. The recommendation is concrete enough to act on without further interpretation.",
        aIt: "Non consegniamo strategy deck. Consegniamo documenti di architettura che un ingegnere può implementare e un registro dei rischi che un team di compliance può difendere. La raccomandazione è abbastanza concreta da poterci agire senza ulteriore interpretazione.",
      },
      {
        q: "What if the audit recommends 'don't build this'?",
        qIt: "E se l'audit raccomanda «non costruitelo»?",
        a: "That's a successful outcome. It happens in roughly a third of audits. You've spent a few days of senior time and saved a quarter of build time on the wrong system. We'd rather refuse work than build something we know won't survive production.",
        aIt: "È un esito di successo. Accade in circa un terzo degli audit. Avete speso qualche giorno di tempo senior e risparmiato un trimestre di sviluppo sul sistema sbagliato. Preferiamo rifiutare il lavoro piuttosto che costruire qualcosa che sappiamo non sopravvivrà alla produzione.",
      },
      {
        q: "Do you sign NDAs?",
        qIt: "Firmate NDA?",
        a: "Standard for audit work. Mutual NDA before access to anything material.",
        aIt: "Prassi standard per il lavoro di audit. NDA reciproco prima dell'accesso a qualsiasi materiale sensibile.",
      },
      {
        q: "Do we keep the deliverables if we don't engage further?",
        qIt: "Manteniamo i deliverable se non proseguiamo l'ingaggio?",
        a: "Yes. The report, the diagrams, and the risk register are yours. Audit fee is paid in full at the audit's end. There's no clawback if you choose not to build.",
        aIt: "Sì. Il report, i diagrammi e il registro dei rischi sono vostri. Il compenso dell'audit viene saldato per intero alla fine dell'audit. Non c'è alcun clawback se scegliete di non costruire.",
      },
    ],
  },
];

export function getService(slug: ServiceContent["slug"]): ServiceContent | undefined {
  return services.find((s) => s.slug === slug);
}

export const SERVICE_SLUGS = services.map((s) => s.slug);
