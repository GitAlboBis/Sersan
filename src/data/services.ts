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
 */

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
  // 01 — AI-Native Software Development
  // ============================================================
  {
    slug: "engineering",
    number: "01",
    name: "AI-Native Software Development",
    nameIt: "Sviluppo Software AI-Native",
    positioning: "Production software, AI wired in, not bolted on.",
    positioningIt: "Software di produzione, con l'AI integrata, non incollata sopra.",
    description:
      "Full-stack product engineering with AI integrated where it earns its place. Agents, retrieval, copilots, and model-powered workflows shipped as part of real software, with the typing, tests, observability, and rollback paths the rest of the codebase already has.",
    descriptionIt:
      "Ingegneria di prodotto full-stack con l'AI integrata dove guadagna il proprio spazio. Agenti, retrieval, copilot e workflow basati su modelli rilasciati come parte di software reale, con la tipizzazione, i test, l'observability e i percorsi di rollback che il resto della codebase ha già.",
    problem: {
      eyebrow: "What goes wrong with AI features",
      eyebrowIt: "Cosa va storto con le funzionalità AI",
      title: "Most teams ship the AI feature and forget it's still software.",
      titleIt: "La maggior parte dei team rilascia la funzionalità AI e dimentica che è pur sempre software.",
      body: "The model gets the attention. The UI sliding around it is undertyped, undertested, and untraced. By month two the team can't tell whether the new bug is the model, the prompt, the retrieval, the cache, or the API change someone shipped on Friday. AI features are still software. They need the same engineering discipline the rest of your product gets.",
      bodyIt: "Il modello cattura l'attenzione. L'interfaccia che gli ruota intorno è poco tipizzata, poco testata e priva di tracing. Al secondo mese il team non sa più se il nuovo bug è il modello, il prompt, il retrieval, la cache o la modifica all'API che qualcuno ha rilasciato venerdì. Le funzionalità AI sono pur sempre software: richiedono la stessa disciplina ingegneristica che applicate al resto del prodotto.",
    },
    builds: [
      {
        title: "Product engineering: frontend, backend, infra",
        titleIt: "Ingegneria di prodotto: frontend, backend, infrastruttura",
        detail:
          "Typescript / Python / Go services, typed APIs, database design, deploy pipelines. The non-AI 70% of the system that has to be right before the AI 30% can be reliable.",
        detailIt:
          "Servizi in Typescript / Python / Go, API tipizzate, progettazione del database, pipeline di deploy. Il 70% non-AI del sistema che deve essere corretto prima che il 30% di AI possa essere affidabile.",
      },
      {
        title: "AI integrations as first-class product code",
        titleIt: "Integrazioni AI come codice di prodotto di prima classe",
        detail:
          "LLM calls, retrieval, agents, copilots, written as typed modules with retry, timeout, cost ceilings, structured logging, and feature flags. Not a wrapper around an OpenAI call.",
        detailIt:
          "Chiamate a LLM, retrieval, agenti, copilot, scritti come moduli tipizzati con retry, timeout, tetti di costo, logging strutturato e feature flag. Non un wrapper attorno a una chiamata a OpenAI.",
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
          "OpenTelemetry spans for the whole request: frontend submit, backend handler, retrieval, model call, tool execution, response. 3am incidents read like a trace, not archaeology.",
        detailIt:
          "Span OpenTelemetry per l'intera richiesta: submit del frontend, handler del backend, retrieval, chiamata al modello, esecuzione dei tool, risposta. Gli incidenti delle 3 del mattino si leggono come una trace, non come archeologia.",
      },
      {
        title: "Owner handover: code, runbook, on-call training",
        titleIt: "Handover all'owner: codice, runbook, formazione on-call",
        detail:
          "An engineer on your team takes the system. We pair, document, simulate incidents, and only leave when the on-call rota can actually run it.",
        detailIt:
          "Un ingegnere del vostro team prende in carico il sistema. Facciamo pairing, documentiamo, simuliamo incidenti e ci ritiriamo solo quando il turno di on-call è davvero in grado di gestirlo.",
      },
    ],
    useCases: [
      {
        title: "Greenfield product with AI at its core",
        titleIt: "Prodotto greenfield con l'AI al centro",
        detail:
          "A new product or feature where AI is the value proposition: RAG copilot, agentic workflow, generative tool. We build the product around the AI, not the AI bolted onto a Wordpress.",
        detailIt:
          "Un nuovo prodotto o funzionalità in cui l'AI è la proposta di valore: copilot RAG, workflow agentico, tool generativo. Costruiamo il prodotto attorno all'AI, non l'AI incollata su un Wordpress.",
      },
      {
        title: "Rescue: production AI feature that's misbehaving",
        titleIt: "Recupero: funzionalità AI in produzione che si comporta male",
        detail:
          "Your AI feature shipped, works on stage, and now the team can't reproduce production failures. We instrument, evaluate, and harden it back to reliable.",
        detailIt:
          "La vostra funzionalità AI è in produzione, funziona in staging e ora il team non riesce a riprodurre i guasti in produzione. La strumentiamo, la valutiamo e la irrobustiamo fino a renderla di nuovo affidabile.",
      },
      {
        title: "Adding AI to existing software",
        titleIt: "Aggiungere l'AI a software esistente",
        detail:
          "You have a working product and want to wire AI into a specific workflow, without rewriting the rest of the codebase. Tight scope, real integration, evals from day one.",
        detailIt:
          "Avete un prodotto funzionante e volete integrare l'AI in un workflow specifico, senza riscrivere il resto della codebase. Scope ristretto, integrazione reale, eval dal primo giorno.",
      },
    ],
    deliverables: [
      { text: "Production code in your repository, owned by your team", textIt: "Codice di produzione nel vostro repository, di proprietà del vostro team" },
      { text: "Eval harness with day-zero baseline + weekly drift CI", textIt: "Eval harness con baseline al day zero + CI settimanale sul drift" },
      { text: "Structured tracing, OpenTelemetry-compatible", textIt: "Tracing strutturato, compatibile OpenTelemetry" },
      { text: "Typed AI integration modules (model calls, retrieval, tools)", textIt: "Moduli di integrazione AI tipizzati (chiamate ai modelli, retrieval, tool)" },
      { text: "Deploy pipeline + monitoring + rollback path", textIt: "Pipeline di deploy + monitoring + percorso di rollback" },
      { text: "Runbook + on-call handover with your team", textIt: "Runbook + handover on-call con il vostro team" },
    ],
    caseStudyIds: ["spherenode", "quantex", "revolut"],
    timeline: "4–12 weeks · fixed scope",
    timelineIt: "4–12 settimane · scope fisso",
    faqs: [
      {
        q: "Do you build on top of LangChain / LlamaIndex / framework X?",
        qIt: "Costruite sopra LangChain / LlamaIndex / framework X?",
        a: "Sometimes. We pick the framework by what the engagement actually needs. For tight production loops we often skip frameworks entirely and write the orchestration directly. Fewer abstractions to debug at 3am.",
        aIt: "A volte. Scegliamo il framework in base a ciò di cui l'ingaggio ha realmente bisogno. Per loop di produzione serrati spesso saltiamo del tutto i framework e scriviamo l'orchestrazione direttamente. Meno astrazioni da debuggare alle 3 del mattino.",
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
    nameIt: "Automazione dei Workflow",
    positioning: "Automation that compounds, not breaks.",
    positioningIt: "Automazione che si compone, non che si rompe.",
    description:
      "LLM-augmented workflows wired into your existing systems, with retry paths, cost guardrails, and an internal owner who actually trusts what it does.",
    descriptionIt:
      "Workflow potenziati da LLM e integrati nei vostri sistemi esistenti, con percorsi di retry, guardrail sui costi e un owner interno che si fida davvero di ciò che fanno.",
    problem: {
      eyebrow: "What goes wrong with automation",
      eyebrowIt: "Cosa va storto con l'automazione",
      title: "Your Zapier stack is one schema change away from silently dropping work on the floor.",
      titleIt: "Il vostro stack Zapier è a una sola modifica di schema dal perdere silenziosamente del lavoro per strada.",
      body: "Most automation died by accumulation. One Zap, then four, then a Make scenario, then a webhook a contractor wrote two years ago. Nobody knows the full graph. When it breaks at 2am, someone finds out from a customer.",
      bodyIt: "La maggior parte delle automazioni è morta per accumulo. Uno Zap, poi quattro, poi uno scenario su Make, poi un webhook che un consulente ha scritto due anni fa. Nessuno conosce il grafo completo. Quando si rompe alle 2 del mattino, qualcuno lo scopre da un cliente.",
    },
    builds: [
      {
        title: "LLM-augmented workflows on top of real engineering",
        titleIt: "Workflow potenziati da LLM su una base di ingegneria reale",
        detail:
          "The orchestration layer is code, in your repo, with tests. The LLM steps are wrapped in retry, cost budgeting, and graceful fallback to a human queue when the model isn't confident.",
        detailIt:
          "Il layer di orchestrazione è codice, nel vostro repo, con i test. Gli step LLM sono avvolti in retry, budgeting dei costi e fallback graduale verso una coda umana quando il modello non è sufficientemente sicuro.",
      },
      {
        title: "Human-in-the-loop where the cost of being wrong is high",
        titleIt: "Human-in-the-loop dove il costo dell'errore è alto",
        detail:
          "Not every step needs review. We map which decisions can run autonomously and which need a human checkbox, by impact, by reversibility, by regulator.",
        detailIt:
          "Non ogni step richiede revisione. Mappiamo quali decisioni possono procedere in autonomia e quali richiedono un via libera umano, per impatto, per reversibilità, per regolatore.",
      },
      {
        title: "Retry, rollback, and dead-letter paths",
        titleIt: "Percorsi di retry, rollback e dead-letter",
        detail:
          "Every step has a defined failure behaviour. Failed work routes to a dead-letter queue your team can inspect, replay, or escalate. No silent drops.",
        detailIt:
          "Ogni step ha un comportamento di fallimento definito. Il lavoro fallito viene instradato in una dead-letter queue che il vostro team può ispezionare, rieseguire o escalare. Nessuna perdita silenziosa.",
      },
      {
        title: "Cost-per-run instrumentation",
        titleIt: "Strumentazione del costo per esecuzione",
        detail:
          "Token spend per workflow, per step, per customer. Budget alerts before the monthly invoice arrives. Runaway-loop protection at the orchestrator level.",
        detailIt:
          "Spesa in token per workflow, per step, per cliente. Alert di budget prima che arrivi la fattura mensile. Protezione dai loop fuori controllo a livello di orchestratore.",
      },
      {
        title: "Owner handover with runbook",
        titleIt: "Handover all'owner con runbook",
        detail:
          "An engineer on your team owns the system after handover. We pair with them, document failure modes, and run an incident simulation before we leave.",
        detailIt:
          "Dopo l'handover il sistema è di proprietà di un ingegnere del vostro team. Facciamo pairing con lui, documentiamo le modalità di guasto ed eseguiamo una simulazione di incidente prima di ritirarci.",
      },
    ],
    useCases: [
      {
        title: "Replacing a fragile Zapier / n8n / Make stack",
        titleIt: "Sostituire uno stack Zapier / n8n / Make fragile",
        detail:
          "Five years of duct-tape automation consolidated into one orchestrator with proper observability. We migrate workflow-by-workflow, never big-bang.",
        detailIt:
          "Cinque anni di automazione tenuta insieme con il nastro adesivo consolidati in un unico orchestratore con observability adeguata. Migriamo workflow per workflow, mai in modalità big-bang.",
      },
      {
        title: "High-volume document or ticket processing",
        titleIt: "Elaborazione di documenti o ticket ad alto volume",
        detail:
          "Inbound work that needs classification, routing, summarisation, or extraction. LLM does the judgement; rules do the routing; a human approves anything ambiguous.",
        detailIt:
          "Lavoro in ingresso che richiede classificazione, instradamento, sintesi o estrazione. L'LLM esprime il giudizio; le regole fanno l'instradamento; un umano approva tutto ciò che è ambiguo.",
      },
      {
        title: "Back-office workflows tied to compliance",
        titleIt: "Workflow di back-office legati alla compliance",
        detail:
          "Where every step needs an audit trail. We design for traceability first, then automate within those boundaries.",
        detailIt:
          "Dove ogni step richiede un audit trail. Progettiamo prima per la tracciabilità, poi automatizziamo entro quei confini.",
      },
    ],
    deliverables: [
      { text: "Orchestrator code in your repository", textIt: "Codice dell'orchestratore nel vostro repository" },
      { text: "Per-step retry / rollback / dead-letter routing", textIt: "Routing per step di retry / rollback / dead-letter" },
      { text: "Cost dashboard + budget alerts", textIt: "Dashboard dei costi + alert di budget" },
      { text: "Human-review queue with audit log", textIt: "Coda di revisione umana con audit log" },
      { text: "Workflow documentation + failure runbook", textIt: "Documentazione dei workflow + runbook dei guasti" },
      { text: "Optional: 30-day stabilisation window post-launch", textIt: "Opzionale: finestra di stabilizzazione di 30 giorni post-lancio" },
    ],
    caseStudyIds: ["terra-noa", "regione-sardegna", "apple-uk"],
    timeline: "2–6 weeks per workflow · fixed scope",
    timelineIt: "2–6 settimane per workflow · scope fisso",
    faqs: [
      {
        q: "Do you replace Zapier or work alongside it?",
        qIt: "Sostituite Zapier o lavorate al suo fianco?",
        a: "Both, depending on volume and reliability requirements. Low-volume, low-stakes flows can stay in Zapier. Anything that's tied to revenue, compliance, or customer-facing SLAs gets moved to owned code.",
        aIt: "Entrambi, a seconda del volume e dei requisiti di affidabilità. I flussi a basso volume e bassa criticità possono restare in Zapier. Tutto ciò che è legato a fatturato, compliance o SLA verso i clienti viene spostato su codice di proprietà.",
      },
      {
        q: "Which orchestration platform do you use?",
        qIt: "Quale piattaforma di orchestrazione utilizzate?",
        a: "We default to lightweight workflow code in the customer's existing stack (Python / Node) over heavyweight platforms. For long-running jobs we use Temporal or Inngest. We almost never reach for Airflow on greenfield work. It's optimised for a different problem.",
        aIt: "Per impostazione predefinita preferiamo codice di workflow leggero nello stack esistente del cliente (Python / Node) rispetto a piattaforme pesanti. Per i job di lunga durata usiamo Temporal o Inngest. Quasi mai ricorriamo ad Airflow su lavori greenfield: è ottimizzato per un problema diverso.",
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
  // 03 — MLOps & Evaluation
  // ============================================================
  {
    slug: "mlops",
    number: "03",
    name: "MLOps & Evaluation",
    nameIt: "MLOps & Valutazione",
    positioning: "Models in production, not in notebooks.",
    positioningIt: "Modelli in produzione, non nei notebook.",
    description:
      "Evaluation, deployment, monitoring, and rollback for ML systems that actually ship. Built to be operated by your team, not by us.",
    descriptionIt:
      "Valutazione, deployment, monitoring e rollback per sistemi ML che vanno davvero in produzione. Costruiti per essere operati dal vostro team, non da noi.",
    problem: {
      eyebrow: "What goes wrong with ML in production",
      eyebrowIt: "Cosa va storto con il ML in produzione",
      title: "Models that ship once and rot in production are not in production. They're decoration.",
      titleIt: "I modelli che vanno in produzione una volta e poi marciscono non sono in produzione. Sono decorazione.",
      body: "Most ML projects end at the notebook. The model trains, the team celebrates, the deployment happens via a manual SSH, and six months later nobody can tell whether accuracy has drifted because nobody is measuring.",
      bodyIt: "La maggior parte dei progetti ML si ferma al notebook. Il modello viene addestrato, il team festeggia, il deployment avviene via SSH manuale e sei mesi dopo nessuno sa dire se l'accuratezza sia derivata, perché nessuno la sta misurando.",
    },
    builds: [
      {
        title: "Evaluation suite: regression + drift + safety",
        titleIt: "Suite di valutazione: regressione + drift + safety",
        detail:
          "A held-out test set you can re-run. Drift metrics on production inputs. Safety checks for sensitive predictions. Run in CI on every model update.",
        detailIt:
          "Un test set held-out che potete rieseguire. Metriche di drift sugli input di produzione. Controlli di safety per le predizioni sensibili. Eseguiti in CI a ogni aggiornamento del modello.",
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
          "When drift exceeds threshold, the pipeline opens a retraining ticket, not an outage. A named owner on your team approves the retraining run and the redeployment.",
        detailIt:
          "Quando il drift supera la soglia, la pipeline apre un ticket di retraining, non un disservizio. Un owner designato nel vostro team approva la run di retraining e il nuovo deployment.",
      },
    ],
    useCases: [
      {
        title: "MLOps from scratch",
        titleIt: "MLOps da zero",
        detail:
          "You have models in notebooks and no deployment pipeline. We design eval, registry, monitoring, and rollback from greenfield.",
        detailIt:
          "Avete modelli nei notebook e nessuna pipeline di deployment. Progettiamo eval, registry, monitoring e rollback partendo da greenfield.",
      },
      {
        title: "Inherited ML platform that nobody understands",
        titleIt: "Piattaforma ML ereditata che nessuno comprende",
        detail:
          "Six engineers built it, four have left, and nobody can deploy without help. We map the surface, write the missing runbook, fill the eval gap, and hand it back operable.",
        detailIt:
          "L'hanno costruita sei ingegneri, quattro se ne sono andati e nessuno riesce a fare deploy senza aiuto. Mappiamo la superficie, scriviamo il runbook mancante, colmiamo la lacuna sulle eval e la riconsegniamo operabile.",
      },
      {
        title: "Regulated ML: fintech / healthtech / public sector",
        titleIt: "ML regolamentato: fintech / healthtech / settore pubblico",
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
      { text: "Optional: 60-day operate-with-team engagement", textIt: "Opzionale: ingaggio di 60 giorni di operatività affiancata al team" },
    ],
    caseStudyIds: ["revolut", "jp-morgan", "pharma-deloitte", "apple-uk", "who"],
    timeline: "4–10 weeks · fixed scope",
    timelineIt: "4–10 settimane · scope fisso",
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
        a: "Usually yes. About a third of MLOps engagements are 'this model works, get it operable'. We wrap it with eval, monitoring, rollback, and a deployment story, without touching the training code.",
        aIt: "Di solito sì. Circa un terzo degli ingaggi di MLOps è del tipo «questo modello funziona, rendetelo operabile». Lo avvolgiamo con eval, monitoring, rollback e una storia di deployment, senza toccare il codice di training.",
      },
    ],
  },

  // ============================================================
  // 04 — AI Architecture & Audits
  // ============================================================
  {
    slug: "architecture",
    number: "04",
    name: "AI Architecture & Audits",
    nameIt: "Architettura & Audit AI",
    positioning: "Find what should not be built, before code becomes debt.",
    positioningIt: "Individuare ciò che non andrebbe costruito, prima che il codice diventi debito.",
    description:
      "Senior architectural review of AI systems and proposals: what to build, what to buy, what to kill. Written deliverables your team can act on without us.",
    descriptionIt:
      "Revisione architetturale senior di sistemi e proposte AI: cosa costruire, cosa acquistare, cosa eliminare. Deliverable scritti su cui il vostro team può agire senza di noi.",
    problem: {
      eyebrow: "What goes wrong with AI architecture",
      eyebrowIt: "Cosa va storto con l'architettura AI",
      title: "Two quarters and an engineering team gone, on a system that was wrong before line one of code.",
      titleIt: "Due trimestri e un team di ingegneria spesi su un sistema che era sbagliato già prima della prima riga di codice.",
      body: "Most failed AI projects failed at architecture, not at execution. The vendor was wrong, the integration plan was naive, the data wasn't where it was assumed to be, or the regulatory posture didn't survive contact with a real lawyer. By week eight, the team is committed to a path that should have been killed in scoping.",
      bodyIt: "La maggior parte dei progetti AI falliti è fallita sull'architettura, non sull'esecuzione. Il vendor era sbagliato, il piano di integrazione era ingenuo, i dati non erano dove si presumeva che fossero, oppure la postura regolatoria non è sopravvissuta al confronto con un vero avvocato. All'ottava settimana il team è ormai impegnato su un percorso che andava abbandonato in fase di scoping.",
    },
    builds: [
      {
        title: "Systems audit: architecture, data, risk, cost, compliance",
        titleIt: "Audit di sistema: architettura, dati, rischio, costo, compliance",
        detail:
          "End-to-end review of an existing or proposed AI system. The deliverable is a 12–20 page written report your engineering team and your board can both read.",
        detailIt:
          "Revisione end-to-end di un sistema AI esistente o proposto. Il deliverable è un report scritto di 12–20 pagine che sia il vostro team di ingegneria sia il vostro board possono leggere.",
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
          "Documented risks with severity, likelihood, mitigation. EU AI Act / DORA / sector-specific compliance posture stated explicitly, not waved at.",
        detailIt:
          "Rischi documentati con severità, probabilità e mitigazione. Postura di compliance verso EU AI Act / DORA / normative di settore dichiarata in modo esplicito, non accennata.",
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
        title: "Pre-commit architecture review",
        titleIt: "Revisione architetturale pre-commitment",
        detail:
          "You're about to commit engineering time + budget to an AI project. We do the architecture work before you do.",
        detailIt:
          "State per impegnare tempo di ingegneria e budget su un progetto AI. Facciamo il lavoro di architettura prima che lo facciate voi.",
      },
      {
        title: "AI Systems Production Audit",
        titleIt: "Audit di produzione di sistemi AI",
        detail:
          "You have AI in production (or close) and need an honest readiness review before a board meeting, customer commitment, audit, or regulator.",
        detailIt:
          "Avete AI in produzione (o quasi) e vi serve una revisione onesta di prontezza prima di un consiglio di amministrazione, un impegno con un cliente, un audit o un regolatore.",
      },
      {
        title: "Inherited AI system",
        titleIt: "Sistema AI ereditato",
        detail:
          "You took over an AI system you didn't design. We tell you what you actually have, what's at risk, and what to do first.",
        detailIt:
          "Avete preso in carico un sistema AI che non avete progettato. Vi diciamo cosa avete davvero, cosa è a rischio e cosa fare per primo.",
      },
      {
        title: "Vendor selection / RFP support",
        titleIt: "Selezione del vendor / supporto all'RFP",
        detail:
          "You're evaluating AI vendors and the demos all look the same. We give you the technical questions to ask, and we score the answers.",
        detailIt:
          "State valutando vendor AI e le demo si assomigliano tutte. Vi forniamo le domande tecniche da porre e valutiamo le risposte.",
      },
    ],
    deliverables: [
      { text: "Written report (12–20 pages, your repo / your inbox)", textIt: "Report scritto (12–20 pagine, nel vostro repo / nella vostra inbox)" },
      { text: "Risk register with severities + mitigation", textIt: "Registro dei rischi con severità + mitigazione" },
      { text: "Build vs. buy vs. don't-build recommendation per component", textIt: "Raccomandazione build vs. buy vs. non costruire per ogni componente" },
      { text: "Reference architecture diagrams + sequencing plan", textIt: "Diagrammi di architettura di riferimento + piano di sequenziamento" },
      { text: "60-min walkthrough call with engineering + leadership", textIt: "Call di walkthrough di 60 min con ingegneria + leadership" },
      { text: "Optional: credit toward a follow-on build engagement", textIt: "Opzionale: credito a valere su un successivo ingaggio di build" },
    ],
    caseStudyIds: ["leonardo", "stealth-greentech", "salvatori", "regione-sardegna"],
    timeline: "1, 2, or 3 weeks · fixed fee",
    timelineIt: "1, 2 o 3 settimane · compenso fisso",
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
        a: "That's a successful outcome. It happens in roughly a third of audits. You've spent the cost of one senior engineer for a week and saved a quarter of build time on the wrong system. We'd rather refuse work than build something we know won't survive production.",
        aIt: "È un esito di successo. Accade in circa un terzo degli audit. Avete speso il costo di un ingegnere senior per una settimana e risparmiato un trimestre di sviluppo sul sistema sbagliato. Preferiamo rifiutare il lavoro piuttosto che costruire qualcosa che sappiamo non sopravvivrà alla produzione.",
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
