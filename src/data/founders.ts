// Founder images live in /public/founders/ — referenced as absolute paths
// rather than imported, so Next.js handles them as static assets.
const alessandroImg = "/founders/alessandro-serratt.webp";
const micheleImg = "/founders/michele-sanna.webp";

export interface FounderProfile {
  name: string;
  initials: string;
  image: string;
  anchor: string;
  linkedIn: string;
  badges: string[];
  roleKey: string;
  bioKey: string;
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
    roleKey: "founders.sebastiano.role",
    bioKey: "founders.sebastiano.bio",
    roleEn: "CEO · Commercial Systems Lead",
    roleIt: "CEO · Lead Sistemi Commerciali",
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
    authorRole: "Co-Founder & CEO, SERSAN",
    authorBio:
      "Owns scoping, proposals, pricing, client communication, and engagement structure on every Sersan engagement, from first call to handover.",
  },
  {
    name: "Michele Sanna",
    initials: "MS",
    image: micheleImg,
    anchor: "michele",
    linkedIn: "https://www.linkedin.com/in/michele-sanna-work/",
    badges: ["PhD, LSE", "8 yrs senior delivery"],
    roleKey: "founders.andrea.role",
    bioKey: "founders.andrea.bio",
    roleEn: "CPTO · Technical Lead",
    roleIt: "CPTO · Lead Tecnico",
    accent: "cool",
    credentialsEn: [
      "PhD Applied Mathematics, LSE",
      "8 years senior delivery at tier-1 institutions",
    ],
    credentialsIt: [
      "PhD in Matematica Applicata, LSE",
      "8 anni di delivery senior in istituzioni Tier-1",
    ],
    previouslyAt: ["J.P. Morgan", "Revolut", "Deloitte", "Brevan Howard", "Accenture"],
    shortBioEn:
      "Architects and ships AI-powered software in regulated, high-stakes environments. Owns the product build, AI layer, data path, evaluation strategy, and what runs in production.",
    shortBioIt:
      "Progetta e porta in produzione software AI-powered in contesti regolamentati e ad alta criticità. Guida la build di prodotto, il layer AI, il data path, la strategia di evaluation e tutto ciò che gira in produzione.",
    bioEn:
      "PhD Applied Mathematics, LSE (Stochastic Differential Geometry for Optimization in Deep Learning). Eight years senior delivery across fintech, public sector, aerospace, and renewables: full-stack engineering at Revolut, financial consulting at J.P. Morgan, ML/MLOps at Deloitte, quantitative market analysis at Brevan Howard (Cayman), business architecture at Accenture. Shipped autonomous orbit management for a LEO satellite constellation, regional healthcare workflows for Sardegna (SIBAR/SISAR/FSE), and ML-based PV+BESS forecasting. CTO of a greentech startup that exited Oct 2024. Currently CPTO of Sersan and Presidente CDA & CTO at Cooperativa Agricola Terra Noa.",
    bioIt:
      "PhD in Matematica Applicata, LSE (Geometria Differenziale Stocastica per l'Ottimizzazione nel Deep Learning). Otto anni di delivery senior tra fintech, settore pubblico, aerospace e rinnovabili: full-stack in Revolut, financial consulting in J.P. Morgan, ML/MLOps in Deloitte, analisi quantitativa in Brevan Howard (Cayman), architettura di business in Accenture. Ha consegnato orbit management autonomo per una costellazione di satelliti LEO, workflow sanitari regionali per la Sardegna (SIBAR/SISAR/FSE), e forecasting ML per impianti PV+BESS. CTO di una startup greentech con exit Oct 2024. Attualmente CPTO di Sersan e Presidente CDA & CTO di Cooperativa Agricola Terra Noa.",
    expertiseEn: ["Architecture", "ML/MLOps", "FinTech Engineering", "Production AI"],
    expertiseIt: ["Architettura", "ML/MLOps", "FinTech Engineering", "AI in Produzione"],
    stack: ["Python", "PyTorch", "TypeScript / React", "FastAPI", "Kubernetes", "Terraform", "AWS / GCP", "Postgres", "Kafka", "MQTT", "OpenTelemetry", "LangChain"],
    authorRole: "Co-Founder & CPTO, SERSAN",
    authorBio:
      "Enterprise architect and ML engineer. Builds AI-powered software, data platforms, and the production systems that run them.",
  },
];

export const getFounder = (name: string) => founders.find((f) => f.name === name);

export const authorBios: Record<string, { initials: string; role: string; bio: string }> = Object.fromEntries(
  founders.map((f) => [f.name, { initials: f.initials, role: f.authorRole, bio: f.authorBio }])
);

export const authorUrls: Record<string, string> = Object.fromEntries(
  founders.map((f) => [f.name, `/about#${f.anchor}`])
);
