export interface CaseStudyMetric {
  value: string;
  label: string;
  labelIt: string;
}

/**
 * Per-project palette for the detail surface (Lusion work-detail grammar,
 * ANALISI_LUSION_WORK.md §3.2 — but brand-fit tempered: where Lusion re-skins
 * the WHOLE page per project, Sersan keeps the navy base and re-tints only the
 * HIGHLIGHT (links, progress bar, eyebrow, launch CTA hover). `bg`/`text`
 * exist for the rare project whose media demands a shifted ground; omitted =
 * site tokens.
 */
export interface CaseStudyPalette {
  /** The ONE per-project accent (CSS color). Defaults to the site cyan. */
  highlight?: string;
  /** Detail-surface base override — omit for the site navy. */
  bg?: string;
  /** Text override when `bg` shifts far from the navy. */
  text?: string;
}

/**
 * One item in the detail page's media rail (desktop: horizontal, scrubbed by
 * vertical scroll; mobile: vertical stack — ANALISI_LUSION_WORK.md §3).
 * `video`/`image` carry a src + intrinsic size (the rail derives width from
 * the shared rail height × aspect). `text` panels are typographic beats — a
 * big value + label, same shape as CaseStudyMetric — used where a project has
 * no shippable imagery (prior-role engagements under confidentiality).
 */
export interface CaseStudyRailItem {
  type: "video" | "image" | "text";
  /** Public-path media src (`/case-studies/…`). Required for video/image. */
  src?: string;
  /** Video poster frame (webp) — painted before the loop starts. */
  poster?: string;
  /** Intrinsic media width in px — aspect source, not a layout size. */
  width?: number;
  /** Intrinsic media height in px. */
  height?: number;
  /** Breaks out to full viewport height while crossing (Lusion data-fullscreen). */
  fullscreen?: boolean;
  /** Text panels: the big display value ("−47%", "€18M/yr"). */
  value?: string;
  valueIt?: string;
  /** Text panels: the supporting line under the value. */
  label?: string;
  labelIt?: string;
}

export interface CaseStudy {
  id: string;
  client: string;
  engagement: string;
  engagementIt: string;
  role: string;
  roleIt: string;
  domain: string;
  domainIt: string;
  industry: "FinTech" | "Healthcare" | "Aerospace" | "Public Sector" | "Industrial" | "Energy" | "Agritech";
  summary: string;
  summaryIt: string;
  techStack: string[];
  metrics: CaseStudyMetric[];
  /** Optional live URL of the deployed product, when public. */
  liveUrl?: string;
  /** Optional screenshot of the live product, used as a card preview. */
  previewImage?: string;
  /** Optional brand logo (monochrome hover-reveal) for cards without a screenshot. */
  logoImage?: string;
  /**
   * Home "Featured Work" grid membership + order (1 = first card). Absent =
   * archive-only. The grid is the Lusion-grammar section replacing the sticky
   * rail (work-section refactor, 2026-08-20).
   */
  featured?: number;
  /**
   * Depth map twin of `previewImage` (same framing, single-channel-in-RGB
   * webp) for the home card's depth-parallax + DOF shader. Generated offline
   * by scripts/generate-depth-maps.mjs — never hand-authored. Cards without
   * one render the still flat (or the brand panel when there is no still).
   */
  depthImage?: string;
  /** Per-project detail accenting — see CaseStudyPalette. */
  palette?: CaseStudyPalette;
  /**
   * Detail media rail. When absent, the rail is derived: text panels from
   * `metrics` (+ the summary as a lead panel), so every study gets the new
   * detail layout without duplicated data.
   */
  railItems?: CaseStudyRailItem[];
}


export const caseStudies: CaseStudy[] = [
  {
    id: "spherenode",
    featured: 1,
    palette: { highlight: "#3BE1FF" },
    depthImage: "/case-studies/depth/spherenode-depth.webp",
    client: "SphereNode",
    engagement: "Vertical trading-education platform (Sersan Build)",
    engagementIt: "Piattaforma verticale di trading education (Build Sersan)",
    role: "Sersan Team. End-to-End Product, AI & Platform",
    roleIt: "Team Sersan. Prodotto, AI & Piattaforma End-to-End",
    domain: "FinTech · Trading Education · RAG Mentor · Community · CRM",
    domainIt: "FinTech · Trading Education · Mentor RAG · Community · CRM",
    industry: "FinTech",
    summary:
      "Proprietary platform that collapses eight SaaS tools (Circle, Teachable, Zoom, Intercom, HubSpot, Mailchimp, Stripe, Notion) into one vertical product for retail-trading education in Italy. Unified Academy, Live Trading, RAG-based AI Mentor (Gemini), Community, CRM, Payments, and Broadcasts behind a single login and brand. Live in production at spherenode.com.",
    summaryIt:
      "Piattaforma proprietaria che consolida otto strumenti SaaS (Circle, Teachable, Zoom, Intercom, HubSpot, Mailchimp, Stripe, Notion) in un prodotto verticale per la trading education retail italiana. Academy, Live Trading, Mentor AI RAG (Gemini), Community, CRM, Payments e Broadcasts unificati dietro un singolo login e brand. Live in produzione su spherenode.com.",
    techStack: ["TypeScript", "React", "Python", "FastAPI", "PostgreSQL", "Supabase", "Gemini RAG", "Vimeo", "Capacitor", "PWA", "Stripe / Whop", "OpenTelemetry"],
    metrics: [
      { value: "8 → 1", label: "SaaS tools consolidated into a single proprietary platform", labelIt: "Strumenti SaaS consolidati in una sola piattaforma proprietaria" },
      { value: "Live", label: "Production at spherenode.com, launching now", labelIt: "In produzione su spherenode.com, in lancio" },
      { value: "32", label: "Granular RBAC capabilities for safe team scaling", labelIt: "Capability RBAC granulari per scalare il team in sicurezza" },
      { value: "PWA + iOS + Android", label: "One codebase, three install paths via Capacitor", labelIt: "Una codebase, tre install path via Capacitor" },
      { value: "IT + EN", label: "Bilingual from day one, every public string", labelIt: "Bilingue dal day one, ogni stringa pubblica" },
      { value: "RAG", label: "AI Mentor grounded only in proprietary curriculum (Gemini)", labelIt: "Mentor AI fondato solo sul curriculum proprietario (Gemini)" },
    ],
    liveUrl: "https://www.spherenode.com",
    previewImage: "/case-studies/spherenode-preview.webp",
    logoImage: "/case-studies/logos/logo-white.svg",
    /* Detail rail media (Lusion parity): product loops captured from the
       live site (Playwright screencast → ping-pong H.264, ~28s each). The
       lead still stays first — it is the flip-flight landing rect. */
    railItems: [
      { type: "image", src: "/case-studies/spherenode-preview.webp", width: 1600, height: 940 },
      { type: "video", src: "/case-studies/spherenode/main.mp4", poster: "/case-studies/spherenode/main-poster.webp", width: 1280, height: 720 },
      { type: "video", src: "/case-studies/spherenode/features.mp4", poster: "/case-studies/spherenode/features-poster.webp", width: 1280, height: 720, fullscreen: true },
    ],
  },
  {
    id: "quantex",
    featured: 2,
    palette: { highlight: "#2A7FFF" },
    depthImage: "/case-studies/depth/quantex-depth.webp",
    client: "Quantex.live",
    engagement: "AI-Native Quant Trading Platform (Sersan Build)",
    engagementIt: "Piattaforma di Trading Quantitativo AI-Native (Build Sersan)",
    role: "Sersan Team. End-to-End Product, AI & Platform",
    roleIt: "Team Sersan. Prodotto, AI & Piattaforma End-to-End",
    domain: "FinTech · Quant · LLM Agents · Real-Time Data",
    domainIt: "FinTech · Quant · Agenti LLM · Dati Real-Time",
    industry: "FinTech",
    summary:
      "AI-native quantitative trading platform. End-to-end build by the Sersan team: real-time market data ingestion, agentic LLM research workflows, and signal generation for retail and prosumer traders. V1 live at quantex.live; V2 AI layer in active development.",
    summaryIt:
      "Piattaforma di trading quantitativo AI-native. Build end-to-end del team Sersan: ingestion di dati di mercato in tempo reale, workflow di ricerca con agenti LLM e generazione di segnali per trader retail e prosumer. V1 live su quantex.live; layer AI V2 in sviluppo attivo.",
    techStack: ["TypeScript", "React", "Node.js", "Python", "PostgreSQL", "Redis", "LLM Agents", "WebSockets", "Vercel"],
    metrics: [
      { value: "Live", label: "Production at quantex.live", labelIt: "In produzione su quantex.live" },
      { value: "V2", label: "AI layer in active development", labelIt: "Layer AI in sviluppo attivo" },
      { value: "5 phases", label: "14-week build roadmap", labelIt: "Roadmap di build di 14 settimane" },
    ],
    liveUrl: "https://www.quantex.live",
    previewImage: "/case-studies/quantex-preview.webp",
    logoImage: "/case-studies/logos/logo.svg",
    /* Detail rail media — same capture pipeline as SphereNode. */
    railItems: [
      { type: "image", src: "/case-studies/quantex-preview.webp", width: 1600, height: 922 },
      { type: "video", src: "/case-studies/quantex/main.mp4", poster: "/case-studies/quantex/main-poster.webp", width: 1280, height: 720 },
      { type: "video", src: "/case-studies/quantex/features.mp4", poster: "/case-studies/quantex/features-poster.webp", width: 1280, height: 720, fullscreen: true },
    ],
  },
  {
    id: "terra-noa",
    featured: 3,
    palette: { highlight: "#58C97B" },
    depthImage: "/case-studies/depth/terranoa-depth.webp",
    client: "Terra Noa",
    engagement: "Integrated Agritech & Renewables (Sersan Engagement)",
    engagementIt: "Agritech & Rinnovabili Integrato (Engagement Sersan)",
    role: "Sersan Team. Board Leadership, Architecture & Data Platform",
    roleIt: "Team Sersan. Leadership Consiliare, Architettura & Data Platform",
    domain: "Agritech · Renewables · IoT · Predictive Maintenance · SCADA",
    domainIt: "Agritech · Rinnovabili · IoT · Manutenzione Predittiva · SCADA",
    industry: "Agritech",
    summary:
      "Thirteen-business-line integrated operation across agriculture, hospitality and renewable energy in Sulcis Iglesiente, Sardinia. A Sersan engagement led from the board with Michele as President & CTO: digital architecture owned end-to-end, ~1.5 MWp of agrivoltaic capacity planned across tens of hectares, with IoT sensor networks, agrivoltaic monitoring, predictive-maintenance pipelines, thermographic and agricultural drone telemetry, and SCADA-adjacent integrations already running on a Databricks-centred stack. Focus on sustainable local biomass, energy autonomy, and circular-economy practices across the operating lines.",
    summaryIt:
      "Operazione integrata su tredici linee di business tra agricoltura, ospitalità ed energia rinnovabile nel Sulcis Iglesiente, in Sardegna. Engagement Sersan guidato dal consiglio con Michele come Presidente & CTO: architettura digitale end-to-end, ~1,5 MWp di capacità agrivoltaica pianificati su decine di ettari, con reti di sensori IoT, monitoring agrivoltaico, pipeline di manutenzione predittiva, telemetria da droni termografici e agricoli, e integrazioni SCADA-adjacent già in produzione su uno stack centrato su Databricks. Focus su biomassa locale sostenibile, autonomia energetica e pratiche di economia circolare lungo tutte le linee operative.",
    techStack: ["Databricks", "PySpark", "Delta Lake", "Python", "MLflow", "Kafka", "MQTT", "Grafana", "SCADA / OT", "Drone Telemetry", "Computer Vision"],
    metrics: [
      { value: "13 business lines", label: "agriculture, hospitality and renewables on one data backbone", labelIt: "agricoltura, ospitalità e rinnovabili su un'unica spina dorsale dati" },
      { value: "~1.5 MWp", label: "agrivoltaic capacity planned across tens of hectares in Sulcis Iglesiente", labelIt: "capacità agrivoltaica pianificata su decine di ettari nel Sulcis Iglesiente" },
      { value: "Live on Databricks", label: "IoT, predictive maintenance, drone telemetry and SCADA-adjacent systems already in production", labelIt: "IoT, manutenzione predittiva, telemetria droni e sistemi SCADA-adjacent già in produzione" },
      { value: "Sardinia", label: "sustainable biomass, energy autonomy and circular-economy across the operating lines", labelIt: "biomassa sostenibile, autonomia energetica ed economia circolare lungo le linee operative" },
    ],
    liveUrl: "https://terranoa.it",
    previewImage: "/case-studies/terranoa-preview.webp",

  },
  {
    id: "revolut",
    featured: 4,
    palette: { highlight: "#8AB8FF" },
    client: "Revolut",
    engagement: "Real-Time Anti-Fraud ML Platform",
    engagementIt: "Piattaforma ML Anti-Frode in Tempo Reale",
    role: "Senior Data Scientist / ML Engineer",
    roleIt: "Senior Data Scientist / ML Engineer",
    domain: "FinTech · Fraud Detection · Real-Time Inference",
    domainIt: "FinTech · Rilevamento Frodi · Inferenza Real-Time",
    industry: "FinTech",
    summary:
      "Designed and shipped a two-stage detection pipeline, sub-40ms gradient-boosted scoring at the transaction layer, plus a GraphSAGE GNN over account/device/IBAN graphs to surface mule networks and coordinated fraud rings.",
    summaryIt:
      "Progettata e rilasciata una pipeline di rilevamento a due stadi, scoring gradient-boosted sub-40ms al livello transazione, più una GNN GraphSAGE su grafi account/device/IBAN per identificare reti mule e schemi di frode coordinati.",
    techStack: ["Python", "PyTorch", "DGL", "XGBoost", "Kafka", "Flink", "Feast", "Redis", "Kubernetes", "MLflow", "Snowflake"],
    metrics: [
      { value: "−47%", label: "false positive rate on card-not-present transactions within 6 months", labelIt: "tasso di falsi positivi su transazioni card-not-present in 6 mesi" },
      { value: "+31%", label: "fraud capture rate (value-weighted) vs. legacy rules engine", labelIt: "tasso di cattura frodi (pesato per valore) vs. motore a regole legacy" },
      { value: "~€18M/year", label: "estimated fraud losses prevented (cards + SEPA combined)", labelIt: "perdite da frode prevenute (carte + SEPA combinate)" },
      { value: "p99 220ms → 38ms", label: "inference latency reduction", labelIt: "riduzione latenza di inferenza" },
    ],
    logoImage: "/case-studies/logos/revolut.svg",
  },
  {
    id: "jp-morgan",
    featured: 5,
    palette: { highlight: "#9DB7D9" },
    client: "J.P. Morgan",
    engagement: "Quantitative ML across Treasury, Credit & Aerospace Research",
    engagementIt: "ML Quantitativo su Treasury, Credito e Ricerca Aerospaziale",
    role: "VP · Quantitative Data Scientist (Liquidity & Credit ML)",
    roleIt: "VP · Quantitative Data Scientist (ML Liquidità e Credito)",
    domain: "FinTech · Treasury · Credit Risk · Aerospace Research",
    domainIt: "FinTech · Treasury · Rischio Credito · Ricerca Aerospaziale",
    industry: "FinTech",
    summary:
      "Three years of quantitative ML work across J.P. Morgan, spanning treasury, credit risk, and an aerospace research collaboration. Built a streaming intraday-liquidity forecasting engine across CHAPS, Fedwire, TARGET2 and CLS using a Temporal Fusion Transformer with a Bayesian state-space layer for calibrated 15-minute-ahead nostro balances. Designed a corporate credit early-warning system on alternative data (shipping manifests, news NLP, invoice behaviour, satellite indicators) feeding a DeepSurv survival model, with SR 11-7-aligned governance. On a seconded quantitative research collaboration, developed a deep-RL station-keeping policy (PPO with recurrent critic) for autonomous satellite control, with formally-verified safety constraints.",
    summaryIt:
      "Tre anni di lavoro di ML quantitativo in J.P. Morgan tra treasury, rischio di credito e una collaborazione di ricerca in ambito aerospaziale. Costruito un motore di forecasting di liquidità intraday in streaming su CHAPS, Fedwire, TARGET2 e CLS con un Temporal Fusion Transformer su un livello state-space bayesiano per saldi nostro a 15 minuti calibrati. Progettato un sistema di early-warning su default corporate basato su dati alternativi (manifesti di spedizione, NLP su news, comportamento delle fatture, indicatori satellitari) che alimenta un modello di sopravvivenza DeepSurv, con un pacchetto di governance allineato a SR 11-7. Su una collaborazione di ricerca quantitativa distaccata, sviluppata una policy Deep RL (PPO con critic ricorrente) per station-keeping satellitare autonomo, con vincoli di sicurezza formalmente verificati.",
    techStack: ["Python", "PyTorch", "JAX", "Spark Structured Streaming", "Kafka", "Kdb+/q", "Databricks", "Delta Lake", "Snowflake", "Hugging Face", "Ray RLlib", "OpenShift"],
    metrics: [
      { value: "−22%", label: "peak intraday exposure on USD clearing", labelIt: "esposizione intraday di picco su clearing USD" },
      { value: "~$140M/day", label: "of trapped collateral released through smarter payment sequencing", labelIt: "di collateral bloccato liberato tramite sequencing dei pagamenti più intelligente" },
      { value: "0.89 AUC", label: "12-month credit downgrade prediction (vs. 0.71 baseline logistic model)", labelIt: "predizione downgrade creditizio a 12 mesi (vs. 0,71 modello logistico baseline)" },
      { value: "78%", label: "of eventual downgrades flagged ≥90 days in advance", labelIt: "dei downgrade effettivi segnalati con ≥90 giorni di anticipo" },
      { value: "−18%", label: "satellite fuel per year vs. baseline MPC controller (aerospace research collab)", labelIt: "carburante satellitare all'anno vs. controller MPC baseline (collaborazione di ricerca aerospaziale)" },
    ],
    logoImage: "/case-studies/logos/jp-morgan.svg",
  },
  {
    id: "apple-uk",
    featured: 6,
    palette: { highlight: "#B8C4D4" },
    client: "Apple UK (via Deloitte)",
    engagement: "Retail Demand & Allocation Forecasting",
    engagementIt: "Forecasting Domanda & Allocazione Retail",
    role: "Data Scientist (Consulting)",
    roleIt: "Data Scientist (Consulting)",
    domain: "Retail Operations · Time-Series ML · Supply Chain",
    domainIt: "Operations Retail · ML Time-Series · Supply Chain",
    industry: "Industrial",
    summary:
      "Hierarchical SKU × store × week forecasting across 200+ stores and ~2,500 active SKUs using an N-BEATS / TFT ensemble, with attribute-based transfer learning for new-product cold starts.",
    summaryIt:
      "Forecasting gerarchico SKU × store × settimana su 200+ negozi e ~2.500 SKU attivi usando un ensemble N-BEATS / TFT, con transfer learning attribute-based per cold start su nuovi prodotti.",
    techStack: ["Python", "PyTorch Forecasting", "GluonTS", "Snowflake", "dbt", "Airflow"],
    metrics: [
      { value: "19% → 8.4%", label: "forecast MAPE reduction on launch-quarter SKUs", labelIt: "riduzione MAPE su SKU del trimestre di lancio" },
      { value: "−23%", label: "stock-outs on top-50 revenue SKUs", labelIt: "rotture di stock sui top-50 SKU per fatturato" },
      { value: "−€4.1M/year", label: "in unplanned air-freight expediting costs", labelIt: "in costi di air-freight non pianificati" },
    ],
    logoImage: "/case-studies/logos/apple-uk.svg",
  },
  {
    id: "pharma-deloitte",
    palette: { highlight: "#7FD1AE" },
    client: "Tier-1 Pharmaceutical (via Deloitte)",
    engagement: "Clinical Trial Site Selection ML",
    engagementIt: "ML per Selezione Siti di Trial Clinici",
    role: "Data Scientist (Consulting)",
    roleIt: "Data Scientist (Consulting)",
    domain: "Life Sciences · ML · Trial Operations",
    domainIt: "Life Sciences · ML · Operations Trial",
    industry: "Healthcare",
    summary:
      "Site-performance prediction model over real-world data, EHR-derived epidemiology, investigator publication history, and regulatory inspection records. Combined with a portfolio optimiser (mixed-integer programming) for site mix selection.",
    summaryIt:
      "Modello di predizione delle performance dei siti su dati real-world, epidemiologia da EHR, storia di pubblicazioni degli investigator e registri di ispezione regolatoria. Combinato con un ottimizzatore di portfolio (mixed-integer programming) per la selezione del mix di siti.",
    techStack: ["Python", "LightGBM", "SHAP", "Gurobi", "Azure ML", "Databricks"],
    metrics: [
      { value: "+34%", label: "first-patient-in speed across two adopted oncology trials", labelIt: "velocità di first-patient-in su due trial oncologici adottati" },
      { value: "92%", label: "enrolment target hit rate (vs. ~65% historical baseline)", labelIt: "tasso di raggiungimento target di arruolamento (vs. ~65% baseline storico)" },
      { value: "~€12M/trial", label: "saved in avoided timeline extensions", labelIt: "risparmiati in estensioni di timeline evitate" },
    ],
  },
  {
    id: "regione-sardegna",
    palette: { highlight: "#4AA6DE" },
    client: "Regione Sardegna (via Accenture)",
    engagement: "FSE Sardegna · SISAR · SIBAR / SIBEAR",
    engagementIt: "FSE Sardegna · SISAR · SIBAR / SIBEAR",
    role: "Data Scientist / Solution Architect",
    roleIt: "Data Scientist / Solution Architect",
    domain: "Public Sector · Healthcare IT · Digital Identity",
    domainIt: "Settore Pubblico · Healthcare IT · Identità Digitale",
    industry: "Public Sector",
    summary:
      "Multi-year regional healthcare modernisation: FSE 2.0 compliance, HL7-FHIR interoperability across 8 ASL, probabilistic patient matching, terminology services (SNOMED-CT, LOINC, ICD), plus chronic-disease readmission models and clinical document auto-classification.",
    summaryIt:
      "Modernizzazione sanitaria regionale pluriennale: compliance FSE 2.0, interoperabilità HL7-FHIR su 8 ASL, matching probabilistico dei pazienti, servizi di terminologia (SNOMED-CT, LOINC, ICD), più modelli di riammissione per malattie croniche e auto-classificazione di documenti clinici.",
    techStack: ["Java/Spring", "PostgreSQL", "Mirth Connect", "HAPI-FHIR", "Python", "Kafka", "OpenShift", "SPID/CIE"],
    metrics: [
      { value: "2.1M+ records", label: "reconciled into a unified regional MPI (<0.3% residual duplication)", labelIt: "riconciliati in un MPI regionale unificato (<0,3% duplicazione residua)" },
      { value: "8/8 ASL", label: "FSE 2.0 compliance achieved on schedule", labelIt: "compliance FSE 2.0 raggiunta nei tempi previsti" },
      { value: "0.82 AUC", label: "readmission-risk model on COPD; pilot wards saw −17% readmissions", labelIt: "modello rischio riammissione su COPD; reparti pilota −17% riammissioni" },
      { value: "F1 = 0.91", label: "document auto-classification across 24 specialty classes (~40k hours/year removed)", labelIt: "auto-classificazione documenti su 24 classi di specialità (~40k ore/anno rimosse)" },
    ],
    logoImage: "/case-studies/logos/accenture.svg",
  },
  {
    id: "salvatori",
    palette: { highlight: "#E8A33D" },
    client: "Salvatori",
    engagement: "Fractional CTO · Industrial AI programme (Sersan engagement)",
    engagementIt: "CTO frazionale · Programma AI Industriale (Ingaggio Sersan)",
    role: "Sersan / Michele Sanna. Chief Technology Officer (Contract)",
    roleIt: "Sersan / Michele Sanna. Chief Technology Officer (Contract)",
    domain: "Industrial · Computer Vision · Predictive Maintenance · RL",
    domainIt: "Industriale · Computer Vision · Manutenzione Predittiva · RL",
    industry: "Industrial",
    summary:
      "Five-month CTO contract running a cross-functional industrial-AI programme: predictive maintenance across the asset fleet, vision-based defect detection on Jetson edge devices, and a model-based RL controller (MuZero-inspired) tuning setpoints on a continuous process under quality constraints. Tuscany-based luxury manufacturer.",
    summaryIt:
      "Contratto CTO di cinque mesi alla guida di un programma AI industriale cross-funzionale: manutenzione predittiva sulla flotta asset, rilevamento difetti vision-based su dispositivi edge Jetson, e un controller RL model-based (ispirato a MuZero) che regola i setpoint su un processo continuo sotto vincoli di qualità. Manifatturiero di lusso, Toscana.",
    techStack: ["Python", "PyTorch", "ONNX", "NVIDIA Jetson", "TimescaleDB", "Grafana", "MLflow", "Kubernetes (on-prem)", "OPC-UA", "MQTT"],
    metrics: [
      { value: "Dec 2024 → Apr 2025", label: "Five-month CTO contract through to handover", labelIt: "Contratto CTO di cinque mesi fino all'handover" },
      { value: "3 surfaces", label: "Predictive maintenance · vision defect detection · RL setpoint control", labelIt: "Manutenzione predittiva · vision defect detection · controllo setpoint RL" },
      { value: "On-prem", label: "Kubernetes-based MLOps stack, fully behind plant firewall", labelIt: "Stack MLOps su Kubernetes, dietro firewall di stabilimento" },
      { value: "Edge", label: "Jetson devices running ONNX-exported models on the line", labelIt: "Jetson sul campo che eseguono modelli esportati ONNX" },
    ],
    logoImage: "/case-studies/logos/salvatori.svg",
  },
  {
    id: "leonardo",
    palette: { highlight: "#C4262E" },
    client: "Leonardo S.p.A. (Freelance)",
    engagement: "SecDevOps Rebuild of Satellite-Imagery Platform",
    engagementIt: "Rebuild SecDevOps di Piattaforma di Imagery Satellitare",
    role: "SecDevOps / Platform Engineer (Freelance)",
    roleIt: "SecDevOps / Platform Engineer (Freelance)",
    domain: "GEOINT · Cloud Security · Platform Engineering",
    domainIt: "GEOINT · Cloud Security · Platform Engineering",
    industry: "Aerospace",
    summary:
      "Zero-trust platform rebuild for a commercial satellite-imagery service: Kubernetes + Istio service mesh with mTLS, SPIFFE/SPIRE workload identity, SLSA-3 build pipelines with Sigstore signatures, and cryptographic tagging for export-controlled scenes.",
    summaryIt:
      "Rebuild zero-trust della piattaforma per un servizio commerciale di imagery satellitare: Kubernetes + service mesh Istio con mTLS, identità workload SPIFFE/SPIRE, pipeline di build SLSA-3 con firme Sigstore, e tagging crittografico per scene export-controlled.",
    techStack: ["Kubernetes", "Istio", "Terraform", "Vault", "ArgoCD", "GitHub Actions", "Trivy", "Falco", "Sigstore", "PostGIS", "MinIO", "Rasterio", "GDAL"],
    metrics: [
      { value: "3 weeks → 27 min", label: "deployment lead-time (DORA elite tier)", labelIt: "lead-time di deployment (DORA elite tier)" },
      { value: "22% → 3%", label: "change failure rate reduction", labelIt: "riduzione del change failure rate" },
      { value: "0 critical CVEs", label: "in production images for 11 consecutive months post-migration", labelIt: "in immagini di produzione per 11 mesi consecutivi post-migrazione" },
      { value: "4 months → 3 weeks", label: "new defence-customer onboarding (ISO 27001 + NIS2 readiness passed)", labelIt: "onboarding nuovi clienti difesa (ISO 27001 + NIS2 readiness superati)" },
    ],
    logoImage: "/case-studies/logos/leonardo.svg",
  },
  {
    id: "who",
    palette: { highlight: "#4AA6DE" },
    client: "World Health Organization (Freelance Research Grant)",
    engagement: "Early-Stage Breast-Cancer Nodule Detection",
    engagementIt: "Rilevamento Precoce di Noduli al Seno",
    role: "ML Research Lead (Freelance, Research Grant)",
    roleIt: "ML Research Lead (Freelance, Research Grant)",
    domain: "MedTech · Computer Vision · Oncology Research",
    domainIt: "MedTech · Computer Vision · Ricerca Oncologica",
    industry: "Healthcare",
    summary:
      "Multi-view 3D CNN (adapted MedNeXt) over 420,000 mammograms and 38,000 DBT volumes across 11 countries, with a temporal \"prior-exam\" branch detecting subtle inter-exam changes. DINOv2-style self-supervised pre-training; federated training across hospitals that could not share raw imagery.",
    summaryIt:
      "CNN 3D multi-view (MedNeXt adattato) su 420.000 mammografie e 38.000 volumi DBT in 11 paesi, con una branch temporale \"prior-exam\" che rileva cambiamenti sottili tra esami. Pre-training self-supervised stile DINOv2; training federato su ospedali che non potevano condividere imagery raw.",
    techStack: ["PyTorch", "MONAI", "DICOM/NIfTI", "cuCIM", "Weights & Biases", "Flower (federated)"],
    metrics: [
      { value: "0.94 AUC", label: "detection on held-out multi-centre test set", labelIt: "rilevamento su test set multi-centro held-out" },
      { value: "41%", label: "of lesions later diagnosed at 12–24 months surfaced on prior-negative exams", labelIt: "di lesioni diagnosticate a 12–24 mesi rilevate su esami precedentemente negativi" },
      { value: "−28%", label: "false positives at matched sensitivity vs. previous best open benchmark (Mirai-class)", labelIt: "falsi positivi a sensibilità equivalente vs. miglior benchmark open precedente (classe Mirai)" },
      { value: "WHO guidance", label: "informed peer-reviewed publication on AI-assisted screening in LMIC contexts", labelIt: "pubblicazione peer-reviewed che ha informato le linee guida WHO su screening AI-assistito in contesti LMIC" },
    ],
    logoImage: "/case-studies/logos/who.svg",
  },
  {
    id: "rsa-italy",
    palette: { highlight: "#6FCF97" },
    client: "Italian RSA Network (Freelance)",
    engagement: "Clinical Risk & Operations Platform for Elderly Care",
    engagementIt: "Piattaforma Clinica di Rischio & Operations per Cura degli Anziani",
    role: "ML & Data Platform Lead (Freelance)",
    roleIt: "ML & Data Platform Lead (Freelance)",
    domain: "HealthTech · Long-Term Care · Clinical Decision Support",
    domainIt: "HealthTech · Cure di Lungo Periodo · Clinical Decision Support",
    industry: "Healthcare",
    summary:
      "Unified FHIR-based clinical data model across fragmented RSA source systems, with risk models for falls, pressure ulcers, and early sepsis, plus an acuity-weighted staffing optimiser respecting regional minimum-staffing regulations.",
    summaryIt:
      "Modello dati clinico unificato basato su FHIR su sistemi sorgente RSA frammentati, con modelli di rischio per cadute, ulcere da pressione e sepsi precoce, più un ottimizzatore di staffing pesato per acuità nel rispetto delle normative regionali.",
    techStack: ["Python", "PyTorch", "FastAPI", "PostgreSQL", "HAPI-FHIR", "Redis", "Grafana", "React"],
    metrics: [
      { value: "−34%", label: "in-facility falls with injury across 12 RSAs (~1,800 beds) over 12 months", labelIt: "cadute con infortunio in struttura su 12 RSA (~1.800 posti letto) in 12 mesi" },
      { value: "−41%", label: "stage-2+ pressure ulcers", labelIt: "ulcere da pressione di stadio-2+" },
      { value: "−22%", label: "sepsis-related hospital transfers; antibiotic administration −6.5h earlier", labelIt: "trasferimenti ospedalieri legati a sepsi; somministrazione antibiotici −6,5h in anticipo" },
      { value: "~€2.8M/year", label: "saved in avoided clawbacks and agency-nurse premiums across the network", labelIt: "risparmiati in clawback evitati e premi di personale infermieristico interinale" },
    ],
  },
  {
    id: "stealth-greentech",
    palette: { highlight: "#3ED598" },
    client: "Stealth Greentech (Smart Charter Fleet)",
    engagement: "Smart Private-Charter Platform · CTO · Full Build to Exit",
    engagementIt: "Piattaforma Smart Private-Charter · CTO · Dal Build all'Exit",
    role: "Co-Founder & CTO",
    roleIt: "Co-Fondatore & CTO",
    domain: "Greentech · Marine · Electric Propulsion · IoT · Predictive Maintenance",
    domainIt: "Greentech · Marittimo · Propulsione Elettrica · IoT · Manutenzione Predittiva",
    industry: "Energy",
    summary:
      "Digital platform for a 10-yacht smart private-charter fleet running on electric propulsion. Co-led the technical stack end-to-end: SCADA-adjacent control systems, real-time IoT telemetry for distributed energy management across the fleet, plus the R&D for electric-propulsion control, energy-charging forecasting, and fleet-wide predictive maintenance. Built from inception through to a successful exit in October 2024.",
    summaryIt:
      "Piattaforma digitale per una flotta di 10 yacht smart private-charter a propulsione elettrica. Co-guida dello stack tecnico end-to-end: sistemi di controllo SCADA-adjacent, telemetria IoT in tempo reale per la gestione distribuita dell'energia sull'intera flotta, e R&D su controllo della propulsione elettrica, forecasting della ricarica energetica e manutenzione predittiva di flotta. Costruita dall'inizio fino a un exit con successo a ottobre 2024.",
    techStack: ["Python", "PyTorch", "TimescaleDB", "Kafka", "MQTT", "Grafana", "AWS", "Docker", "SCADA-adjacent", "IoT Edge"],
    metrics: [
      { value: "Exit · Oct 2024", label: "successful sale of the venture", labelIt: "vendita con successo del venture" },
      { value: "10-yacht fleet", label: "full digital platform across the operation", labelIt: "piattaforma digitale completa sull'intera operazione" },
      { value: "End-to-end", label: "inception through to exit, CTO ownership of the entire stack", labelIt: "dall'inizio all'exit, ownership da CTO dell'intero stack" },
      { value: "Fleet-wide", label: "energy forecasting and predictive maintenance under one telemetry plane", labelIt: "forecasting energetico e manutenzione predittiva sotto un'unica piattaforma di telemetria" },
    ],
  },
];

export const industries: CaseStudy["industry"][] = [
  "FinTech",
  "Healthcare",
  "Aerospace",
  "Public Sector",
  "Industrial",
  "Energy",
  "Agritech",
];
