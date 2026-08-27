// Founder images live in /public/founders/ — referenced as absolute paths
// rather than imported, so Next.js handles them as static assets.
const alessandroImg = "/founders/alessandro-serratt.webp";
const micheleImg = "/founders/michele-sanna.webp";
const mattiaImg = "/founders/mattia-scattu.webp";

export interface FounderProfile {
  name: string;
  initials: string;
  image: string;
  anchor: string;
  linkedIn: string;
  badges: string[];
  /** Founder vs employed team member. Any surface whose copy says the word
   * "founder" — /contact's "Talk to a founder", /start's "Who reads this" —
   * MUST iterate `coFounders`, not `founders`. The home rail and /about
   * render the FULL team. Required (not optional) so the compiler forces
   * every entry to be annotated and no consumer can be surprised later. */
  kind: "founder" | "team";
  /** Title only, short. E.g. "CEO · Commercial Lead" */
  roleEn: string;
  roleIt: string;
  /** Long-form bio (used on About page) */
  bioEn: string;
  bioIt: string;
  /** Card-tier short bio, 1-2 sentences, what they own */
  shortBioEn: string;
  shortBioIt: string;
  /** Card-tier credentials list, 2-3 lines */
  credentialsEn: string[];
  credentialsIt: string[];
  /** Optional "previously at" company list */
  previouslyAt?: string[];
  /** Color treatment hint, "warm" (commercial) or "cool" (technical) */
  accent: "warm" | "cool";
  expertiseEn: string[];
  expertiseIt: string[];
  /** Tools / frameworks they personally ship with, surfaced as stack chips */
  stack?: string[];
  authorRole: string;
  authorBio: string;
}

export const founders: FounderProfile[] = [
  {
    name: "Alessandro Serratt",
    initials: "AS",
    image: alessandroImg,
    anchor: "alessandro",
    linkedIn: "https://www.linkedin.com/in/alessandro-serratt/",
    badges: ["USAAI CAIC", "Dual MBA + AI"],
    kind: "founder",
    roleEn: "CEO · Commercial Lead",
    roleIt: "CEO · Lead Commerciale",
    accent: "warm",
    credentialsEn: [
      "USAAI Certified AI Consultant (CAIC)",
      "Dual Master's: MBA + AI in Business",
    ],
    credentialsIt: [
      "Consulente AI Certificato USAAI (CAIC)",
      "Doppio Master: MBA + AI in Business",
    ],
    shortBioEn:
      "Owns scoping, proposals, pricing, client communication, and engagement structure from first call to handover. He turns ambiguous business problems into clear technical briefs, fixed scopes, and accountable delivery.",
    shortBioIt:
      "Gestisce scoping, proposte, pricing, comunicazione con il cliente e struttura dell'ingaggio, dalla prima call all'handover. Trasforma problemi di business ambigui in brief tecnici chiari, scope a costo fisso e delivery con piena responsabilità.",
    bioEn:
      "Owns scoping, proposals, pricing, client communication, and engagement structure from first call to handover. He turns ambiguous business problems into clear technical briefs, fixed scopes, and accountable delivery. USAAI Certified AI Consultant with a dual Master's in MBA and AI in Business.",
    bioIt:
      "Gestisce scoping, proposte, pricing, comunicazione con il cliente e struttura dell'ingaggio, dalla prima call all'handover. Trasforma problemi di business ambigui in brief tecnici chiari, scope a costo fisso e delivery con piena responsabilità. Consulente AI Certificato USAAI con doppio Master in MBA e AI in Business.",
    expertiseEn: ["Scoping", "Product & Brand", "Proposals", "Engagement Lead"],
    expertiseIt: ["Scoping", "Prodotto e Brand", "Proposte", "Lead Ingaggio"],
    stack: ["Claude Code", "Vercel", "MCP", "Notion", "Figma", "Jira"],
    authorRole: "Co-Founder & CEO, SerSan",
    authorBio:
      "Owns scoping, proposals, pricing, client communication, and engagement structure on every SerSan engagement, from first call to handover.",
  },
  {
    name: "Michele Sanna",
    initials: "MS",
    image: micheleImg,
    anchor: "michele",
    linkedIn: "https://www.linkedin.com/in/michele-sanna-work/",
    badges: ["PhD, LSE", "8 yrs senior delivery"],
    kind: "founder",
    roleEn: "CPTO · Technical Lead",
    roleIt: "CPTO · Lead Tecnico",
    accent: "cool",
    credentialsEn: [
      "PhD Applied Mathematics, LSE",
      "8 years senior delivery at tier-1 institutions, pre-SerSan",
    ],
    credentialsIt: [
      "PhD in Matematica Applicata, LSE",
      "8 anni di delivery senior in istituzioni Tier-1, pre-SerSan",
    ],
    previouslyAt: ["J.P. Morgan", "Revolut", "Deloitte", "Brevan Howard", "Accenture"],
    shortBioEn:
      "The named technical owner on an engagement — from a single automation to a platform in production. Owns the build, the data path, and the AI layer where it earns its place.",
    shortBioIt:
      "È il responsabile tecnico di un progetto: da una singola automazione a una piattaforma in produzione. Guida la costruzione, il percorso dei dati e il layer AI dove se lo merita.",
    bioEn:
      "PhD Applied Mathematics, LSE (Stochastic Differential Geometry for Optimization in Deep Learning). Eight years of senior delivery before SerSan, spanning fintech, public sector, aerospace and renewables: Senior Data Scientist / ML Engineer on the real-time anti-fraud platform at Revolut, VP Quantitative Data Scientist on liquidity and credit ML at J.P. Morgan, ML/MLOps at Deloitte, quantitative market analysis at Brevan Howard (Cayman), business architecture at Accenture. That prior work included autonomous orbit management for a LEO satellite constellation, regional healthcare workflows for Sardegna (SIBAR/SISAR/FSE), and ML-based PV+BESS forecasting. CTO of a greentech startup that exited Oct 2024. Now CPTO of SerSan and Presidente CDA & CTO at Cooperativa Agricola Terra Noa.",
    bioIt:
      "PhD in Matematica Applicata, LSE (Geometria Differenziale Stocastica per l'Ottimizzazione nel Deep Learning). Otto anni di delivery senior prima di SerSan, tra fintech, settore pubblico, aerospace e rinnovabili: Senior Data Scientist / ML Engineer sulla piattaforma anti-frode in tempo reale in Revolut, VP Quantitative Data Scientist su ML di liquidità e credito in J.P. Morgan, ML/MLOps in Deloitte, analisi quantitativa in Brevan Howard (Cayman), architettura di business in Accenture. Quel lavoro precedente comprende orbit management autonomo per una costellazione di satelliti LEO, workflow sanitari regionali per la Sardegna (SIBAR/SISAR/FSE), e forecasting ML per impianti PV+BESS. CTO di una startup greentech con exit Oct 2024. Oggi CPTO di SerSan e Presidente CDA & CTO di Cooperativa Agricola Terra Noa.",
    expertiseEn: ["Architecture", "ML/MLOps", "FinTech Engineering", "Production AI"],
    expertiseIt: ["Architettura", "ML/MLOps", "FinTech Engineering", "AI in Produzione"],
    stack: ["Python", "PyTorch", "TypeScript / React", "FastAPI", "Kubernetes", "Terraform", "AWS / GCP", "Postgres", "Kafka", "MQTT", "OpenTelemetry", "LangChain"],
    authorRole: "Co-Founder & CPTO, SerSan",
    authorBio:
      "Enterprise architect and ML engineer. Builds custom software, data platforms, and the AI layers that earn their place in them.",
  },
  {
    name: "Mattia Scattu",
    initials: "MS",
    image: mattiaImg,
    // MUST match /public/founders/<anchor>-headshot.webp — the WebGL sampler
    // resolves the headshot by this slug (FounderPortraitMorph.loadFounder).
    anchor: "mattia",
    linkedIn: "https://www.linkedin.com/in/mattia-scattu-481271356",
    // `badges` and `expertiseEn/It` are required by the interface but currently
    // have NO live render surface (their former consumer, who-and-why.tsx, was
    // deleted in a cleanup). Kept accurate rather than decorative in case a
    // surface revives.
    badges: ["BSc Computer Science", "Published research"],
    kind: "team",
    roleEn: "Software Engineer",
    roleIt: "Software Engineer",
    accent: "cool",
    credentialsEn: [
      "BSc Computer Science, Università di Camerino",
      "Published: Knowledge Graphs as a Semantic Layer for Understanding Robotic Video",
    ],
    credentialsIt: [
      "Laurea Triennale in Informatica, Università di Camerino",
      "Pubblicazione: Knowledge Graphs as a Semantic Layer for Understanding Robotic Video",
    ],
    shortBioEn:
      "Designs and builds internal systems end to end — requirements, data model, interface, delivery. Shipped a maintenance and inventory management system for a resort operator, from formal requirements analysis through to the running software.",
    shortBioIt:
      "Progetta e realizza sistemi gestionali interni dall'inizio alla fine: requisiti, modello dati, interfaccia, rilascio. Ha realizzato un sistema di gestione della manutenzione e dell'inventario per un operatore turistico, dall'analisi formale dei requisiti fino al software in esercizio.",
    bioEn:
      "Builds the internal systems that take manual work out of a business, end to end. At L'Ultima Spiaggia S.r.l. he designed and delivered the information system for a campsite resort, covering maintenance operations and inventory tracking: formal requirements analysis, logical and physical database modelling, interface design, and implementation across the full software lifecycle. Computer Science degree, Università di Camerino. Co-author of \"Knowledge Graphs as a Semantic Layer for Understanding Robotic Video\".",
    bioIt:
      "Realizza dall'inizio alla fine i sistemi interni che tolgono lavoro manuale a un'azienda. In L'Ultima Spiaggia S.r.l. ha progettato e consegnato il sistema informativo di un villaggio turistico, per la gestione della manutenzione e il tracciamento dell'inventario: analisi formale dei requisiti, modellazione logica e fisica della base dati, progettazione dell'interfaccia e implementazione lungo l'intero ciclo di vita del software. Laurea in Informatica, Università di Camerino. Co-autore di \"Knowledge Graphs as a Semantic Layer for Understanding Robotic Video\".",
    expertiseEn: ["Software Design", "Data Modelling", "Process Optimisation", "Applied AI"],
    expertiseIt: ["Progettazione Software", "Modellazione Dati", "Ottimizzazione Processi", "AI Applicata"],
    // `stack` deliberately OMITTED — the source lists no languages or
    // frameworks. Inventing chips here would be the one unverifiable claim on
    // the page. `previouslyAt` likewise omitted: it renders under a "Previously"
    // label directly parallel to Michele's tier-1 row, and a 3-month internship
    // there reads as padding.
    authorRole: "Software Engineer, SerSan",
    authorBio:
      "Software engineer. Builds internal systems end to end, from requirements and data model through to the running software.",
  },
];

export const getFounder = (name: string) => founders.find((f) => f.name === name);

/** The two co-founders ONLY. Use this on any surface whose copy says the word
 * "founder". `founders` remains the FULL team and drives the home rail,
 * /about, and the WebGL morph. Keeping `founders` as the full list means the
 * two surfaces that MUST include Mattia need no import change at all, so the
 * blast radius is exactly the two that must exclude him. */
export const coFounders: FounderProfile[] = founders.filter(
  (f) => f.kind === "founder",
);

export const authorBios: Record<string, { initials: string; role: string; bio: string }> = Object.fromEntries(
  founders.map((f) => [f.name, { initials: f.initials, role: f.authorRole, bio: f.authorBio }])
);

export const authorUrls: Record<string, string> = Object.fromEntries(
  founders.map((f) => [f.name, `/about#${f.anchor}`])
);
