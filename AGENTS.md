  # PROMPT PER CLAUDE CODE — Ricostruzione sito SERSAN (React Three Fiber / Three.js)

> Incolla **tutto** questo file come primo messaggio in Claude Code, dalla cartella vuota del nuovo progetto.
> È scritto in italiano per te; il codice, i commenti e i contenuti del sito restano in inglese (il sito è bilingue EN/IT).

---

## 0. Ruolo e obiettivo

Sei un senior creative front-end engineer. Devi **ricostruire da zero il sito di SERSAN** (società di consulenza AI/ingegneria) con uno stack WebGL moderno, puntando alla **qualità visiva e di interazione di https://lusion.co/** — ma con un'anima adatta a una società di consulenza AI seria, regolata e premium (non un sito-studio generico e chiassoso). Deve trasmettere: rigore tecnico, credibilità enterprise, e padronanza tecnologica di frontiera.

Riferimenti di qualità (da studiare, non da copiare): lusion.co, e in generale il livello "Awwwards Site of the Day". Tagline e tono di SERSAN: **"The intelligence is artificial. The judgement stays human."**

Prima di scrivere codice, completa la **Fase 1 (setup & verifica MCP)** qui sotto e fammi un piano. Costruisci in modo incrementale e verifica visivamente ogni sezione con Playwright.

---

## 1. Stack tecnico (vincolante)

- **Build/Framework:** Vite + React 18 + **TypeScript**. (Niente Next.js: è un sito vetrina prevalentemente statico; Vite è più leggero e veloce per WebGL. Se in futuro serve SSR per SEO, valuteremo.)
- **3D / WebGL:** **three.js** + **@react-three/fiber** (R3F) + **@react-three/drei** (helper) + **@react-three/postprocessing** (Bloom, DOF, vignette, noise).
- **Animazione:** **GSAP** (timeline e sequencing) + **@gsap/react** (`useGSAP`). **Lenis** (`@studio-freight/lenis` / `lenis`) per lo smooth scroll, sincronizzato con il loop di R3F.
- **Stato:** **zustand** per lo stato globale (scroll progress, fase di caricamento, audio on/off, lingua).
- **Stile:** **Tailwind CSS** (il sito attuale lo usa già) + CSS variables per i token. Mobile-first, responsive completo.
- **Debug:** **leva** per pannelli di tuning (da rimuovere/tree-shakare in produzione).
- **Asset 3D pipeline:** modelli `.glb` ottimizzati con **gltf-transform** (Draco/Meshopt per le mesh, KTX2/Basis per le texture). Usa **gltfjsx** per trasformare i `.glb` in componenti R3F tipizzati.
- **Lingue:** EN + IT (toggle in header), come il sito attuale. Architettura i18n semplice (file di dizionari), copy EN fornito sotto, IT da generare.
- **Deploy:** **Vercel** (via Vercel MCP). Preview deploy ad ogni milestone.
- **Performance budget (obbligatorio):** 60fps su desktop recente; degrado elegante (riduci particellari/postprocessing) su mobile e su `prefers-reduced-motion`; lazy-load delle scene 3D; Lighthouse performance ≥ 80 su mobile; rispetta `prefers-reduced-motion` disattivando le animazioni non essenziali.
- **Accessibilità:** contenuti leggibili dai lettori di schermo anche con il WebGL attivo (il 3D è decorativo → `aria-hidden`), focus states, navigazione da tastiera, contrasto AA.

---

## 2. Direzione creativa & brand

**Palette (dark-first):**
- Base/background: `#0B1422` (navy quasi nero — è già il theme-color del sito).
- Superfici: gradazioni di navy/grigio-blu; testo `#F4F6FA` (off-white), testo secondario `~#8A94A6`.
- **Accento "signal"**: un gradiente luminoso usato con parsimonia per la linea animata e i momenti chiave. Proposta: **cyan elettrico → violetto** (es. `#3BE1FF → #7C5CFF`), con un secondo tono caldo opzionale per i picchi. Tienilo sobrio: monocromia navy ovunque, accento solo dove serve impatto. (Mettilo in `leva` così lo rifiniamo insieme.)

**Tipografia (mantieni quella attuale del brand):**
- **Display:** *Editorial New* (Fontshare) — serif con corsivo premium. Per gli heading grandi.
- **Body:** *Switzer* (Fontshare) — sans moderno e distintivo.
- **Mono:** *JetBrains Mono* (Google Fonts) — per eyebrow/label, numeri tabellari, micro-copy tecnico.

**Tono visivo:** tanto spazio negativo, tipografia grande e sicura, micro-interazioni precise, transizioni di pagina fluide, un layer 3D che "respira" dietro/intorno al contenuto senza coprirlo. Niente effetti gratuiti: ogni animazione deve sembrare _intenzionale e ingegnerizzata_ — coerente con un brand che dice "production-grade, non demo".

---

## 3. Effetti chiave da implementare

### 3a. La "linea colorata" che scorre con lo scroll (firma stile Lusion) — PRIORITÀ
Questo **non è un modello 3D**: è un effetto **procedurale in codice**. Implementazione consigliata:
- Definisci una **curva** `THREE.CatmullRomCurve3` che attraversa lo spazio della pagina (serpeggia tra le sezioni).
- Renderizzala come **tubo/linea con gradiente**: o `TubeGeometry` lungo la curva con uno **shader material** (gradiente animato + glow), oppure `<Line>` / `<QuadraticBezierLine>` di drei con `MeshLineMaterial`-style.
- **Guida con lo scroll:** Lenis espone il progresso di scroll (0→1). Mappalo a (a) un uniform `uProgress` che "disegna"/illumina la linea progressivamente, e/o (b) un punto luce che corre lungo la curva (`curve.getPointAt(progress)`), e/o (c) il movimento della camera lungo la curva.
- **Glow:** `EffectComposer` + `Bloom` (selettivo sulla linea) per il bagliore. Aggiungi leggero `Noise`/`Vignette` per profondità cinematografica.
- Sincronizza Lenis ↔ R3F: guida il `requestAnimationFrame` di Lenis dal `useFrame` di R3F (un solo loop), così scroll e render restano allineati.
- Usa `useGSAP` + ScrollTrigger (o direttamente il valore di Lenis) per agganciare reveal di testo/sezioni allo stesso progresso.

### 3b. Modelli 3D (oggetti hero, forme astratte) — via Blender MCP
Per oggetti scolpiti (es. una forma astratta "intelligenza", un oggetto che ruota nell'hero, elementi decorativi):
- Genera/edita in **Blender tramite Blender MCP** (vedi §4), usando **Hyper3D Rodin / Hunyuan3D** per text-to-3D e **Poly Haven** per HDRI/texture/asset reali.
- Esporta in **`.glb`**, ottimizza con gltf-transform, importa in R3F con gltfjsx.
- Materiali avanzati in scena con drei: `MeshTransmissionMaterial` (vetro/gel), `MeshDistortMaterial` (blob organici), environment lighting da HDRI.

### 3c. Altri momenti
- **Preloader** elegante con percentuale (carica gli asset 3D, poi rivela la home con una transizione).
- **Transizioni di pagina** fluide tra le route (overlay/curtain + cross-fade della scena 3D).
- **Reveal su scroll** di titoli/paragrafi (split-text con GSAP), parallax leggero.
- **Cursore custom** (opzionale, desktop) e stati hover magnetici sui CTA.
- **Particellari/punti** sottili nel background (instanced, GPU-friendly).
- Header con **toggle EN/IT** e CTA persistente "Book a scoping call".

---

## 4. MCP NECESSARI — elenca, verifica e configura

**All'avvio, prima di tutto:** verifica quali di questi MCP sono già connessi (`/mcp` in Claude Code), **elencami quelli mancanti con il comando esatto per aggiungerli**, e dimmi quali richiedono un setup manuale una-tantum da parte mia (Blender, chiavi API). Non procedere finché non confermo.

Config Claude Code: i server vanno in `~/.claude.json` o nel `.mcp.json` del progetto.

### Essenziali per questo progetto

1. **Blender MCP** — *generazione e editing di modelli 3D* (Hyper3D Rodin / Hunyuan3D per text-to-3D, Poly Haven per HDRI/texture/asset, esecuzione Python in Blender, export scena).
   - Repo: `ahujasid/blender-mcp`. Setup tipico (Claude Desktop/Code):
     ```json
     { "mcpServers": { "blender": { "command": "uvx", "args": ["blender-mcp"] } } }
     ```
   - **Setup manuale una-tantum (lo faccio io):** installare `uv`, installare **Blender 3.0+**, installare l'addon BlenderMCP dal repo, e cliccare "Connect to Claude" nella sidebar di Blender (premi `N` nella 3D View). Per Hyper3D serve una chiave (free tier su hyper3d.ai / fal.ai; esiste anche una trial key). Tu (Claude Code) **non puoi installare/avviare Blender da solo** → dimmi esattamente cosa fare e quando Blender deve essere aperto e connesso.

2. **Context7 MCP** — *documentazione aggiornata e version-specific* di three.js, R3F, drei, postprocessing, GSAP, Lenis, Vite. Evita che tu scriva codice contro API obsolete (R3F/three cambiano spesso).
   - Setup: `claude mcp add --transport http context7 https://mcp.context7.com/mcp`
   - **Regola operativa:** prima di scrivere/aggiornare qualsiasi codice three.js/R3F/drei/GSAP, **consulta Context7** ("use context7") per l'API corrente della versione installata.

3. **Playwright MCP** — *automazione browser per auto-QA visivo*: apri il sito in build, fai **screenshot**, confronta con i riferimenti, verifica responsive (desktop/tablet/mobile), testa gli stati di scroll e le transizioni, individua errori in console.
   - Setup: `claude mcp add playwright npx @playwright/mcp@latest`
   - **Regola operativa:** dopo ogni sezione, scatta screenshot a più viewport e itera finché il risultato non è all'altezza del riferimento. Non dichiarare "fatto" senza prova visiva.

4. **Vercel MCP** — *deploy e diagnostica*: deploy di preview ad ogni milestone, URL condivisibili, lettura dei build/runtime log.
   - (Già disponibile nel mio ambiente.) Usalo per pubblicare e per debuggare i fallimenti di build.

### Utili / opzionali

5. **GitHub MCP** — repo, branch, commit, PR (workflow ordinato).
   - Setup: `claude mcp add github npx @modelcontextprotocol/server-github` (richiede `GITHUB_TOKEN`).

6. **Firecrawl MCP** — *re-scraping del sito live* se servono copy/asset esatti o immagini dall'attuale https://www.sersan.io (i contenuti testuali sono già qui sotto, quindi è opzionale).
   - Setup: `npx -y firecrawl-mcp` (richiede `FIRECRAWL_API_KEY`).

> Principio: **non installare MCP inutili** — ognuno consuma context e degrada le prestazioni. Per questo progetto i 4 essenziali bastano; aggiungi gli opzionali solo se servono davvero.

---

## 5. Struttura del sito (route) + contenuti

Pagine: **Home `/`**, **Consulting `/consulting`**, **Audit `/audit`**, **Work/Case Studies `/case-studies`**, **Resources/Writing `/resources`**, **About `/about`**, **Contact `/contact`**, **Trust & Compliance `/trust`**.
Nav header: AUDIT · CONSULTING · WORK · WRITING · ABOUT · CONTACT · [EN/IT] · **Book a scoping call**.

Footer (tutte le pagine): tagline "THE INTELLIGENCE IS ARTIFICIAL. THE JUDGEMENT STAYS HUMAN.", newsletter (email + Subscribe), link Audit/Consulting/Work/About/Writing/Trust/Contact, "© 2026 Sersan Limited · 128 City Road, London EC1V 2NX · Co. No. 16878386", Privacy/Terms/Cookies/Preferences, badge "ISO 27001 (IN PROGRESS) · ALIGNED WITH DORA & THE EU AI ACT". Piccolo widget "NOW · ON-CALL · ALESSANDRO · LDN · [ora]". Banner cookie (Customize / Reject all / Accept all).

### Brand / azienda (dati strutturati dal sito)
- **Nome:** SERSAN — *Sersan Limited*. Fondata 2025 (Companies House **16878386**). Sede: **128 City Road, London EC1V 2NX, UK**.
- **Posizionamento:** "AI-powered software engineering · London". Senior AI engineering per fintech, tech e SaaS mid-market: architecture, MLOps, sistemi agentici, AI in produzione. Slogan: *"Senior engineering for AI in production."*
- **Contatti:** info@sersan.io · +39 348 299 9403 · WhatsApp · LinkedIn (`/company/sersan-limited`) · Instagram (`@sersan_ai`). Email dedicate: privacy@sersan.io, security@sersan.io. Lingue: EN/IT. Aree servite: UK, Italia, UE.
- **Fondatori:**
  - **Alessandro Serratt** — CEO, Co-Founder (generalista/commerciale). Doppio master MBA + AI in Business, certificazione CAIC. Possiede sales, scoping, proposte, pricing, prodotto/brand e l'IP scritto della firma (l'"AI Consulting Bible" che informa il framework di audit e il modello di engagement a quattro layer).
  - **Michele Sanna** — CPTO/CTO, Co-Founder (tecnico). PhD Applied Mathematics, LSE (Stochastic Differential Geometry for Optimization in Deep Learning). 8 anni di senior delivery in J.P. Morgan, Revolut, Deloitte, Brevan Howard, Accenture. CTO di una startup greentech con exit in Oct 2024. Board President & CTO di Terra Noa (agritech/rinnovabili, Sardegna). PMP, CBAP, C1.

### HOME `/`
- Eyebrow: `AI-POWERED SOFTWARE ENGINEERING · LONDON`
- **Hero (parola per parola):** "We build AI-powered software. It has to run at 3am." — sub: *"We build it. We operate it. If it breaks at 3am, we're the ones who wake up."* CTA: **Book a scoping call** / **View practice areas**.
- Striscia credibilità: `CPTO · PHD APPLIED MATHEMATICS, LSE · 8 YEARS SENIOR DELIVERY AT` → loghi/nomi: Revolut, J.P. Morgan, Deloitte, Brevan Howard, Accenture.
- **WHO · WHY:** "The senior AI team you'd hire if you could find them." Testo: la maggior parte del lavoro AI finisce o in agenzie che mettono junior sul progetto, o in grandi consultancy che passano tre mesi a fare scoping prima di scrivere codice. Sersan nasce in quel gap, da due founder con profondità complementari — uno profondamente commerciale, uno profondamente tecnico.
- **Due founder** (card 01 / 02) con: ruolo, credenziali, cosa possiedono, e "SHIPS WITH":
  - Alessandro — *CEO · GENERALIST*. CAIC, MBA+AI. SHIPS WITH: Claude Code, Vercel, MCP, Notion, Figma, Jira.
  - Michele — *CPTO · TECHNICAL LEAD*. PhD LSE; 8y tier-1. SHIPS WITH: Python, PyTorch, TypeScript/React, FastAPI, Kubernetes, Terraform, AWS/GCP, Postgres, Kafka, MQTT, OpenTelemetry, LangChain.
- **La tesi, detta semplice:** 01 *Senior people only* (no junior che imparano sul tuo progetto) · 02 *Built to run* (sistemi production-grade, non demo) · 03 *Honest scoping* (ti diciamo quando l'AI non è la risposta). Frase: "AI works best not when it replaces human judgement, but when it extends it."
- **THE TECHNICAL AUDIT:** "A scored map of what to build, fix, and ship next." Una settimana dentro il business → report scritto su cosa è rotto, cosa è manuale, dove l'AI può potenziare il prodotto, e cosa costruiremmo per primo. "You leave with a roadmap."
- **WHAT WE REFUSE — Six things we refuse to do:** 1) *Vibe-coded production* 2) *Junior-staffed audits* 3) *Multi-year retainers* 4) *AI without a kill switch* 5) *Demos without eval sets* (un agente senza 100 test case graded è un lancio di moneta) 6) *Offshore handoff*. Chiusura: "WHAT WE REFUSE IS HALF OF WHAT WE ARE."
- Sezioni ulteriori (placeholder presenti nel sito): self-audit di 60 secondi, "agent loop with guardrails", case studies, how we work, featured articles, FAQ, CTA consulting.

### CONSULTING `/consulting`
- Eyebrow `SENIOR AI-POWERED SOFTWARE ENGINEERING · PRODUCTION SYSTEMS`. H1: "Consulting that lands in production." Sub: build end-to-end (prodotto, layer AI, data path, e le persone reperibili quando va in produzione). CTA: Book a scoping call / Request a technical audit. Bullet: "Cut cycle times from weeks to days", "Get AI into production without breaking things", "Fix the reliability and data-quality issues no one has time for".
- **STACK WE SHIP ON:** Python, TypeScript, PyTorch, Kubernetes, MLflow, Postgres, Kafka, OpenTelemetry, AWS, GCP, Anthropic, OpenAI. Nota: "Tool choice is downstream of the problem."
- **PRACTICE AREAS (What we actually do):** Enterprise & solution architecture · Process automation & workflows · Data platforms & analytics · Applied machine learning · MLOps & deploying ML · FinTech engineering · Quant / risk analytics · Fractional CTO / technical leadership. (Ognuna con una riga di descrizione — vedi sito.) Citazione: "We tend to be the people you call when the deadline isn't moving and the roadmap can't slip."
- **HOW WE ENGAGE (3 pacchetti):**
  - **Technical Audit** (fixed scope) — 5–10 giorni. Include: architecture review, data/ML readiness, performance/reliability scan, workflow bottleneck map, prioritized backlog. Deliverable: audit report, risk register, quick wins, piano 30/60/90, ticket implementabili.
  - **Delivery Sprint** (build + ship) — 2–4 settimane. Design+implementazione, testing/QA, handover docs, walkthrough. Deliverable: componenti production-ready, CI/CD, monitoring hooks, documentazione.
  - **Fractional CTO** (retainer mensile) — roadmap ownership, architecture governance, delivery rituals, vendor alignment, hiring support. Deliverable: roadmap+KPI mensili, decision log, delivery plan, stakeholder updates.
- **PROCESS (How we work):** 01 Diagnose · 02 Design · 03 Deliver · 04 Operationalise. Citazione: "Strategy is only useful once it lands in production."
- **WHAT YOU GET:** tabella deliverable × (AUDIT / SPRINT / CTO): Architecture blueprint, Prioritized backlog, Reference implementation, Data pipeline improvements, Model deployment/MLOps, Observability/monitoring, Team enablement+docs, Leadership cadence+stakeholder updates.
- **FAQ:** Do you only advise or also build? · Can you work with our team/stack? · Security & confidentiality? · Fixed price or T&M? · How fast can we start? · EU compliance constraints? · Kubernetes/MLOps support? · What if we don't know what we need yet?
- **CTA form "Get a scoped plan within 48 hours":** campi Name*, Email*, Company*, Role, Website/product link, Current stack, "What are you trying to do?", focus area (Architecture/Automation/Data/ML/Performance/Fractional CTO/Not sure), "What's getting in the way?", Timeline (ASAP / 2–4 weeks / 1–2 months / Flexible), Budget (<€10k / €10k–€25k / €25k–€50k / €50k+ / Not sure), constraints, checkbox "I'd like an NDA". Nota: "NDA AVAILABLE ON REQUEST · 1-BUSINESS-DAY REPLY · ISO 27001 IN PROGRESS".

### AUDIT `/audit`
- Eyebrow `SIX SURFACES · ONE WEEK · FIXED SCOPE`. H1: "A scored map of what to build, fix, and ship next." Sub: un senior engineer passa una settimana dentro il business (prodotto, sistemi, dati, workflow); esci con un report scritto. "1-business-day reply. No sales pitch on the first call."
- **WHAT WE LOOK AT — Six surfaces:** 01 Your systems & architecture · 02 Your data & ML readiness · 03 Your workflows & manual work · 04 Your tooling & vendor stack · 05 Your team & delivery cadence · 06 Where AI could power your product (opportunità concrete e nominate, e dove l'AI è la risposta sbagliata). (Ognuna con descrizione — vedi sito.)
- **THE DELIVERABLE:** documento scritto ~20–30 pagine (no deck da 80 slide), consegnato come **PDF** + walkthrough live 60–90 min. Contiene: executive summary per CEO e CTO; cosa è rotto (ranked per impatto di business); cosa è manuale (stime di risparmio tempo); cosa l'AI può/non può fare; cosa costruiremmo per primo (scoped, sequenced, stime di effort); roadmap a 90 giorni.
- **HOW THE WEEK RUNS:** Day 1 kick-off & systems walkthrough · Days 2–3 · Days 3–4 · Day 5 · Day 6 read-out. (Timeline interattiva.)
- **THREE DOORS AFTER:** 01 Build it with us · 02 Build it with someone else (la roadmap è tua) · 03 Sit on it (il report non scade).
- **Honest answers (FAQ):** Why is it paid? · What do you need from us? (read access a repo/dashboard/data warehouse/ticketing; tempo con 4–8 persone; NDA opzionale) · Who runs the audit? · What if we don't know what we need yet? · How is this different from a sales discovery call? · What if you find nothing?
- CTA: "Book 30 minutes — no pitch, no proposal unless you ask." Calendario embed (con fallback "Open it in a new tab · info@sersan.io").

### WORK / CASE STUDIES `/case-studies`
- Eyebrow `SELECTED WORK`. H1: "Engineering track record." Sub: software AI-powered che il CPTO Michele Sanna ha shippato in istituzioni tier-1, più build di prodotto attuali di Sersan. Ogni voce etichetta il ruolo e il contesto di delivery.
- **Filtri:** All · FinTech · Healthcare · Aerospace · Public Sector · Industrial · Energy · Agritech.
- **Voci (card con metrica grande, tag settore, ruolo, problema/azione/risultato, STACK):**
  - **SphereNode** (Sersan build, FinTech/Trading Education) — piattaforma verticale che consolida 8 SaaS (Circle, Teachable, Zoom, Intercom, HubSpot, Mailchimp, Stripe, Notion) in un unico prodotto per l'education sul retail trading in Italia. Academy, Live Trading, AI Mentor RAG (Gemini), Community, CRM, Payments. Live su spherenode.com. Stack: TypeScript, React, Python, FastAPI, PostgreSQL, Supabase, Gemini RAG, Vimeo, Capacitor, PWA, Stripe/Whop, OpenTelemetry. Metriche: 8 tool consolidati, 32 capability RBAC, PWA+iOS+Android (Capacitor), bilingue IT+EN.
  - **Quantex.live** (Sersan build, FinTech/Quant) — piattaforma quant AI-native: ingest dati di mercato real-time, workflow di ricerca con agenti LLM, signal generation. V1 live su quantex.live; V2 AI layer in sviluppo. Stack: TypeScript, React, Node.js, Python, PostgreSQL, Redis, LLM Agents, WebSockets, Vercel. Roadmap 14 settimane.
  - **Terra Noa** (Sersan engagement, Agritech/Renewables) — operazione integrata a 13 linee di business (agricoltura, hospitality, rinnovabili) in Sulcis Iglesiente, Sardegna; Michele come President & CTO. ~1.5 MWp agrivoltaico pianificato, reti IoT, monitoraggio agrivoltaico, predictive maintenance, telemetria droni, integrazioni SCADA-adjacent su stack Databricks. Stack: Databricks, PySpark, Delta Lake, Python, MLflow, Kafka, MQTT, Grafana, SCADA/OT, Drone Telemetry, Computer Vision.
  - **Revolut** (prior role, FinTech) — Real-Time Anti-Fraud ML Platform. Pipeline a due stadi: scoring gradient-boosted sub-40ms + GNN GraphSAGE su grafi account/device/IBAN. Metriche: −47% false positive (CNP) in 6 mesi, +31% fraud capture, ~€18M/anno perdite prevenute, latency p99 220ms→38ms. Stack: Python, PyTorch, DGL, XGBoost, Kafka, Flink, Feast, Redis, Kubernetes, MLflow, Snowflake.
  - **J.P. Morgan** (prior role, FinTech) — VP Quantitative Data Scientist. ML quant su treasury/credit/aerospace research: forecasting intraday-liquidity (Temporal Fusion Transformer + Bayesian state-space), credit early-warning (DeepSurv) SR 11-7-aligned, deep-RL station-keeping satellitare (PPO). Metriche: −22% peak intraday exposure, ~$140M/giorno di collateral liberato, −18% fuel satellite. Stack: Python, PyTorch, JAX, Spark Structured Streaming, Kafka, Kdb+/q, Databricks, Delta Lake, Snowflake, Hugging Face, Ray RLlib, OpenShift.
  - **Apple UK (via Deloitte)** (Industrial) — Retail Demand & Allocation Forecasting. N-BEATS/TFT su 200+ store, ~2,500 SKU; transfer learning per cold start. Metriche: MAPE 19%→8.4%, −23% stock-out top-50. Stack: Python, PyTorch Forecasting, GluonTS, Snowflake, dbt, Airflow.
  - **Tier-1 Pharmaceutical (via Deloitte)** (Healthcare) — Clinical Trial Site Selection ML. Modello site-performance + ottimizzatore MIP. Metriche: +34% first-patient-in, ~€12M/trial risparmiati. Stack: Python, LightGBM, SHAP, Gurobi, Azure ML, Databricks.
  - **Regione Sardegna (via Accenture)** (Public Sector) — FSE Sardegna · SISAR · SIBAR/SIBEAR. Modernizzazione sanitaria regionale: FSE 2.0, HL7-FHIR su 8 ASL, patient matching probabilistico, terminology (SNOMED-CT/LOINC/ICD), modelli readmission. Metriche: 2.1M+ record riconciliati in MPI (<0.3% duplicazione), F1=0.91 auto-classificazione. Stack: Java/Spring, PostgreSQL, Mirth Connect, HAPI-FHIR, Python, Kafka, OpenShift, SPID/CIE.
  - **Salvatori** (Sersan engagement, Industrial) — Fractional CTO (contratto 5 mesi, Dec 2024→Apr 2025). Programma industrial-AI: predictive maintenance, vision defect detection su Jetson edge, RL controller (MuZero-inspired). Stack: Python, PyTorch, ONNX, NVIDIA Jetson, TimescaleDB, Grafana, MLflow, Kubernetes (on-prem), OPC-UA, MQTT.
  - **Leonardo S.p.A.** (Aerospace, freelance) — SecDevOps rebuild di piattaforma satellite-imagery zero-trust: Kubernetes + Istio mTLS, SPIFFE/SPIRE, SLSA-3 + Sigstore. Metriche: deployment lead-time 3 settimane→27 min (DORA elite). Stack: Kubernetes, Istio, Terraform, Vault, ArgoCD, GitHub Actions, Trivy, Falco, Sigstore, PostGIS, MinIO, Rasterio, GDAL.
  - **World Health Organization** (Healthcare, research grant) — Early-Stage Breast-Cancer Nodule Detection. CNN 3D multi-view (MedNeXt) su 420k mammografie + 38k DBT, training federato. Metrica: 0.94 AUC. Stack: PyTorch, MONAI, DICOM/NIfTI, cuCIM, Weights & Biases, Flower (federated).
  - **Italian RSA Network** (Healthcare, freelance) — Clinical Risk & Operations Platform per long-term care. Modello dati FHIR; rischio cadute/ulcere/sepsi; staffing optimiser. Metriche: −34% cadute con lesione (12 RSA, ~1,800 letti), −41% ulcere stage-2+, ~€2.8M/anno risparmiati. Stack: Python, PyTorch, FastAPI, PostgreSQL, HAPI-FHIR, Redis, Grafana, React.
  - **Stealth Greentech** (Energy, Co-Founder & CTO) — piattaforma smart-charter per flotta di 10 yacht a propulsione elettrica: SCADA-adjacent, telemetria IoT real-time, R&D propulsione/energia, predictive maintenance. **Exit Oct 2024.** Stack: Python, PyTorch, TimescaleDB, Kafka, MQTT, Grafana, AWS, Docker, SCADA-adjacent, IoT Edge.
- Disclaimer: "All figures reflect measured impact in production or validated simulation environments… some predate Sersan… proprietary methods are abstracted where required by confidentiality."
- CTA finale: "Want this kind of work in your business?" → Book a scoping call / info@sersan.io.

### RESOURCES / WRITING `/resources`
- Eyebrow `FIELD NOTES`. H1: "What we've learned shipping." Sub: "No frameworks-of-frameworks. Just what worked, what failed, and why." Filtri: All · Article · Guide · Case Study · Whitepaper.
- **Articoli** (card con tipo, tempo di lettura, titolo, estratto, autore):
  1. *Why Enterprise Architecture Fails Without Senior Execution* (Article, 8 min, Michele Sanna)
  2. *MLOps in 2026: From Notebook to Production* (Guide, 10 min, Michele Sanna)
  3. *The Fractional CTO: When It Makes Sense* (Article, 7 min, Alessandro Serratt)
  4. *AI Agents in Production: Lessons From Real Deployments* (Article, 11 min, Michele Sanna)
  5. *Data Platform Architecture: Choosing the Right Stack* (Guide, 9 min, Michele Sanna)
  6. *Cloud Migration: Avoiding the Lift-and-Shift Trap* (Guide, 9 min, Alessandro Serratt)
  7. *Microservices vs Monolith: The Honest Trade-offs* (Article, 9 min, Michele Sanna)
  8. *How We Run Technical Audits* (Article, 8 min, Alessandro Serratt)
  9. *RAG Systems in Enterprise: What Works* (Guide, 11 min, Michele Sanna)
  10. *FinTech Architecture: Building Systems That Handle Money* (Article, 12 min, Michele Sanna)

### ABOUT `/about`
- Eyebrow `THE FOUNDING PAIR`. H1: "Senior engineering, senior commercial, in the same room." Sub: deep engineering + deep commercial nella stessa stanza, entrambi senior, su ogni engagement, nessun layer di junior.
- **OUR WHY:** Sersan costruita da due persone con background opposti; lavorare insieme produce qualcosa che nessuno dei due potrebbe costruire da solo — è la tesi. "We believe AI works best not when it replaces human judgement, but when it extends it." Claim: "The intelligence is artificial. The judgement stays human."
- **Bio founder** (versione estesa — vedi sopra in §Brand): Michele Sanna (CTO & CPTO), Alessandro Serratt (CEO).
- **Three rules of engagement:** 01 *Senior or nothing* · 02 *Weekly scope* (no retainer pluriennali; "lock-in is a smell") · 03 *We operate it*.
- **VERIFIABLE, NOT VIBES:** 8 yrs senior delivery · 5 tier-1 institutions · 1 PhD Applied Mathematics LSE · REVOLUT · JP MORGAN · DELOITTE · BREVAN HOWARD · ACCENTURE.
- CTA: "One week inside your stack, with a written verdict at the end."

### CONTACT `/contact`
- Eyebrow `SENIOR REPLY WITHIN 1 BUSINESS DAY`. H1: "Talk to the people who'll build it." Sub: "No SDR funnel, no junior triage. Three short steps and a senior engineer reads it."
- **REACH US DIRECTLY:** EMAIL info@sersan.io · PHONE +39 348 299 9403 · WHATSAPP · COMPANY SERSAN Limited · ADDRESS 128 City Road, London EC1V 2NX · RESPONSE TIME within 1 business day · FOLLOW (social).
- **Talk to a founder:** Alessandro (CEO · Generalist) / Michele (CPTO · Technical Lead).
- **SCOPING INTAKE** form a 3 step (01/03 About you → Your goals → Message): Name*, Email*, Company, …
- Alternative: "Skip the form. Book a working call." Footer note: "SENIOR REPLY WITHIN 1 BUSINESS DAY · NO AUTOMATED FUNNELS".

### TRUST & COMPLIANCE `/trust`
- Eyebrow `ISO 27001 (IN PROGRESS) · DORA · EU AI ACT · GDPR`. H1: "Compliance is wired in." Sub: "Not bolted on." CTA: Request DPA / Privacy Policy. Nota: "LAST UPDATED: MAY 17, 2026 · this page is a summary; the Privacy Policy and DPA govern."
- Sezioni (indice laterale): Overview · Pipeline · GDPR Roles · Data · Legal Bases · Your Rights · Subprocessors · Security · Retention · Cookies · Contact.
- **Compliance pipeline (visualizzazione a stage, ognuno con la norma):** Input (GDPR) → PII redaction (GDPR · EU AI Act Art. 10) → Model router (EU AI Act) → Guardrail check (EU AI Act Art. 14) → Audit log (DORA · ISO 27001) → Output (GDPR). *(Ottimo candidato per un diagramma animato/3D.)*
- **GDPR Roles:** Sersan as Controller (operazioni proprie) vs Processor (engagement client su DPA).
- **Legal bases (Art. 6):** delivery → Art. 6(1)(b); security/audit log → Art. 6(1)(f); B2B outreach → legitimate interests con opt-out; cookies → consent.
- **Your Rights:** Access, Rectification, Erasure, Restriction, Portability, Object, Marketing opt-out (STOP/unsubscribe/privacy@sersan.io). SLA 30 giorni.
- **Subprocessors (tabella):** AWS/GCP/Azure (hosting, SCC+ISO27001+SOC2); OpenAI/Anthropic/Google AI (model API, zero-retention dove disponibile); Supabase/Vercel (sito+lead DB); Resend (email). + International transfers (SCCs).
- **Security controls:** RBAC/least privilege/time-bound creds; MFA; TLS 1.2+ / AES-256; audit logging; backup+restore trimestrale; IR runbook (72h breach clock); vendor review; **AI-specific: kill switch entro 30s, eval gates pre-deploy, output review**. (Posture: ISO 27001 in progress, nessuna certificazione rivendicata al momento.) security@sersan.io.
- **Data retention (tabella):** lead 12 mesi · engagement materials per DPA / entro 30gg dalla terminazione · contract & audit 7 anni · suppression list a tempo indefinito.
- **Cookies:** essential / analytics (opt-in) / preferences (lingua, tema). **Company details:** SERSAN Limited, 128 City Road London EC1V 2NX, Co. No. 16878386. Autorità: ICO (UK) / Garante (IT).

---

## 6. Modalità di lavoro (workflow obbligatorio)

1. **Setup & verifica MCP** (§4): elencami i mancanti + comandi, segnala i setup manuali (Blender/chiavi). Aspetta la mia conferma.
2. **Piano**: proponi struttura cartelle, architettura componenti (R3F Canvas globale + overlay DOM per il contenuto), strategia i18n, e l'elenco delle scene 3D. Aspetta ok.
3. **Scaffold**: Vite+React+TS, Tailwind, R3F/drei/postprocessing, GSAP+Lenis, zustand, routing, font (Editorial New/Switzer/JetBrains Mono), token di colore. Deploy preview vuoto su Vercel.
4. **Sistema di base**: smooth scroll Lenis ↔ R3F sincronizzati, Canvas persistente, preloader, transizioni di route, layout responsive, dark theme, header/footer, banner cookie, toggle EN/IT.
5. **Effetto firma (§3a)**: la linea colorata guidata dallo scroll + Bloom. È la priorità visiva — falla eccellente prima di procedere.
6. **Sezioni pagina per pagina**, dalla Home. Per ognuna: implementa → **screenshot Playwright (desktop+mobile)** → confronta col livello di Lusion → itera. Niente "fatto" senza prova visiva e console pulita.
7. **Modelli 3D (§3b)** dove servono: genera in Blender via MCP (Hyper3D/Poly Haven), esporta GLB ottimizzato, integra con gltfjsx.
8. **Rifinitura**: micro-interazioni, performance (instancing, lazy scenes, budget 60fps, mobile fallback, `prefers-reduced-motion`), accessibilità (contenuto leggibile da screen reader, focus, contrasto AA), SEO base (meta/OG già definiti dal vecchio sito), Lighthouse.
9. **Consegna**: build di produzione, deploy Vercel finale, README con: come girano gli effetti, dove stanno le scene/asset, come rigenerare i modelli 3D, e i comandi MCP usati.

**Regole trasversali:**
- Prima di scrivere codice three.js/R3F/drei/GSAP → **consulta Context7** per l'API della versione installata.
- Verifica il lavoro con **Playwright** (screenshot multi-viewport) prima di dichiararlo completo.
- Commit piccoli e descrittivi; deploy di preview ad ogni milestone.
- Non inventare contenuti: usa il copy fornito sopra (EN) e genera la versione IT. Segnalami i buchi invece di riempirli a caso.
- Chiedi conferma a ogni gate (§6.1, §6.2) e quando serve un mio intervento manuale (Blender, chiavi API, domini).

Inizia ora dalla **Fase 1: verifica e setup degli MCP**, poi proponimi il piano.