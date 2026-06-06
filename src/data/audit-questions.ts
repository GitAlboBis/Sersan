/**
 * Data + matching logic for the homepage 60-second self-audit.
 *
 * Five engineering-shaped questions. Each answer carries one or more
 * `signal` tags. After Q5 we match those signals against a bank of
 * possible first-moves (findings) and surface the top 3 by priority.
 *
 * The matching is deterministic: same answers → same findings.
 * Priorities are integer weights; we sort and take top 3.
 */

export type Choice = {
  id: string;
  labelEn: string;
  labelIt: string;
  /** Tags this choice raises, drive the finding match */
  signals: string[];
};

export type Question = {
  id: string;
  promptEn: string;
  promptIt: string;
  choices: Choice[];
};

export type Finding = {
  id: string;
  nameEn: string;
  nameIt: string;
  descEn: string;
  descIt: string;
  effortEn: string;
  effortIt: string;
  /** Map of signal → priority weight. Higher = matters more. */
  triggers: Record<string, number>;
  /** Base weight (used if any trigger matches) */
  base?: number;
};

// ─────────────────────────────────────────────────────────────────────────
// Questions
// ─────────────────────────────────────────────────────────────────────────

export const QUESTIONS: Question[] = [
  {
    id: "maturity",
    promptEn: "How much AI is in production today?",
    promptIt: "Quanta AI avete oggi in produzione?",
    choices: [
      { id: "none",     labelEn: "None yet, planning",                 labelIt: "Ancora niente, stiamo pianificando",     signals: ["mat:none"] },
      { id: "pilot",    labelEn: "A pilot or two",                       labelIt: "Uno o due pilot",                         signals: ["mat:pilot"] },
      { id: "feature",  labelEn: "One core feature",                     labelIt: "Una feature centrale",                   signals: ["mat:feature"] },
      { id: "multi",    labelEn: "Multiple production systems",          labelIt: "Più sistemi in produzione",              signals: ["mat:multi"] },
    ],
  },
  {
    id: "killswitch",
    promptEn: "If your AI misbehaves, can you turn it off in under 30 seconds?",
    promptIt: "Se l'AI inizia a comportarsi male, riuscite a spegnerla in meno di 30 secondi?",
    choices: [
      { id: "yes",     labelEn: "Yes, single flag, fast rollback",      labelIt: "Sì, un flag solo e rollback rapido",     signals: ["ks:yes"] },
      { id: "partial", labelEn: "Partially, depends on the surface",    labelIt: "In parte, dipende dove",                  signals: ["ks:partial"] },
      { id: "no",      labelEn: "Honestly, no",                          labelIt: "No, sinceramente",                         signals: ["ks:no"] },
      { id: "na",      labelEn: "No AI in prod yet",                     labelIt: "Non abbiamo ancora AI in produzione",     signals: ["ks:na", "mat:none"] },
    ],
  },
  {
    id: "evals",
    promptEn: "How is AI output quality graded before shipping?",
    promptIt: "Come valutate la qualità dell'output AI prima di rilasciarlo?",
    choices: [
      { id: "ci",      labelEn: "100+ test cases on CI",                 labelIt: "Oltre 100 test case in CI",               signals: ["eval:strong"] },
      { id: "manual",  labelEn: "Manual spot-checks",                    labelIt: "Controlli a campione manuali",            signals: ["eval:weak"] },
      { id: "vibes",   labelEn: "Vibes / a few prompts",                 labelIt: "A intuito, con qualche prompt",           signals: ["eval:none"] },
      { id: "ship",    labelEn: "We ship and see",                       labelIt: "Rilasciamo e vediamo come va",            signals: ["eval:none"] },
    ],
  },
  {
    id: "cost",
    promptEn: "How is AI cost tracked today?",
    promptIt: "Come tenete sotto controllo i costi dell'AI oggi?",
    choices: [
      { id: "perreq",  labelEn: "Per-request attribution + dashboards",  labelIt: "Attribuzione per richiesta e dashboard",  signals: ["cost:strong"] },
      { id: "aggr",    labelEn: "Aggregate dashboard",                   labelIt: "Una dashboard aggregata",                  signals: ["cost:weak"] },
      { id: "surprise",labelEn: "Surprise bill at end of month",         labelIt: "Fattura a sorpresa a fine mese",          signals: ["cost:none"] },
      { id: "dunno",   labelEn: "Don't know",                            labelIt: "Non lo sappiamo",                          signals: ["cost:none"] },
    ],
  },
  {
    id: "owner",
    promptEn: "Who owns AI quality on your team?",
    promptIt: "Nel vostro team, chi risponde della qualità dell'AI?",
    choices: [
      { id: "ml",      labelEn: "A dedicated ML/AI lead",                labelIt: "Un lead ML/AI dedicato",                 signals: ["own:strong"] },
      { id: "backend", labelEn: "A backend engineer wears the hat",      labelIt: "Se ne occupa un backend engineer",        signals: ["own:weak"] },
      { id: "pm",      labelEn: "Product / PM",                          labelIt: "Il product manager",                      signals: ["own:weak"] },
      { id: "none",    labelEn: "No one yet",                            labelIt: "Nessuno, per ora",                        signals: ["own:none"] },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Findings bank
// ─────────────────────────────────────────────────────────────────────────

export const FINDINGS: Finding[] = [
  {
    id: "killswitch",
    nameEn: "Kill switch + circuit breaker",
    nameIt: "Kill switch e circuit breaker",
    descEn:
      "A single flag your on-call can flip in 30 seconds, plus rate limits and graceful fallback to a non-AI path.",
    descIt:
      "Un flag che chi è di reperibilità può attivare in 30 secondi, più rate limit e un fallback pulito a un percorso non-AI.",
    effortEn: "~1 week",
    effortIt: "circa 1 settimana",
    triggers: { "ks:no": 12, "ks:partial": 8 },
  },
  {
    id: "evals",
    nameEn: "Eval set + retrieval router",
    nameIt: "Eval set e router di retrieval",
    descEn:
      "A 200-case graded eval set tied to weekly CI. Type-aware retrieval so the agent stops mixing engineering and marketing content.",
    descIt:
      "Un eval set da 200 casi valutati, agganciato alla CI settimanale. Un retrieval che distingue i tipi di contenuto, così l'agent smette di mescolare materiale di engineering e marketing.",
    effortEn: "~3 weeks",
    effortIt: "circa 3 settimane",
    triggers: { "eval:none": 12, "eval:weak": 7 },
  },
  {
    id: "cost",
    nameEn: "Cost attribution + ceiling",
    nameIt: "Attribuzione dei costi e tetto di spesa",
    descEn:
      "Per-call cost tracking, per-tenant budgets with hard ceilings, and dashboards that page someone before you get a surprise invoice.",
    descIt:
      "Costi tracciati per ogni chiamata, budget per tenant con tetti invalicabili, e dashboard che fanno scattare un alert prima che arrivi la fattura a sorpresa.",
    effortEn: "~2 weeks",
    effortIt: "circa 2 settimane",
    triggers: { "cost:none": 10, "cost:weak": 5 },
  },
  {
    id: "observability",
    nameEn: "Production observability + on-call",
    nameIt: "Observability di produzione e reperibilità",
    descEn:
      "OpenTelemetry traces on every AI call, drift detection, latency/cost/quality alerts, and a real on-call rotation, not just dashboards no one reads.",
    descIt:
      "Trace OpenTelemetry su ogni chiamata AI, drift detection, alert su latenza, costo e qualità, e una vera rotazione di reperibilità. Non l'ennesima dashboard che nessuno apre.",
    effortEn: "~3 weeks",
    effortIt: "circa 3 settimane",
    triggers: { "mat:multi": 10, "own:none": 8, "own:weak": 5 },
  },
  {
    id: "architecture",
    nameEn: "AI architecture + scoping",
    nameIt: "Architettura AI e scoping",
    descEn:
      "A reference architecture for your first production AI surface, model gateway, data path, eval harness, sized for your team and SLA.",
    descIt:
      "Un'architettura di riferimento per la vostra prima superficie AI in produzione: model gateway, data path, eval harness. Dimensionata sul vostro team e sui vostri SLA.",
    effortEn: "~2 weeks",
    effortIt: "circa 2 settimane",
    triggers: { "mat:none": 14, "mat:pilot": 8 },
  },
  {
    id: "ownership",
    nameEn: "Fractional AI lead",
    nameIt: "AI lead frazionale",
    descEn:
      "Until you can hire one, a fractional AI lead who owns quality, evals, and on-call. We embed for 90 days and hand back a hiring spec.",
    descIt:
      "Finché non riuscite ad assumerne uno, un AI lead frazionale che si prende in carico qualità, eval e reperibilità. Ci integriamo per 90 giorni e vi consegniamo la job spec per l'assunzione definitiva.",
    effortEn: "90-day contract",
    effortIt: "contratto di 90 giorni",
    triggers: { "own:none": 12 },
  },
  {
    id: "enablement",
    nameEn: "Team enablement + AI playbook",
    nameIt: "Abilitazione del team e AI playbook",
    descEn:
      "A short playbook for your engineers covering prompts, evals, guardrails, and when to escalate. Plus a hands-on workshop.",
    descIt:
      "Un playbook breve per i vostri engineer: prompt, eval, guardrail e quando far scattare un'escalation. Più un workshop hands-on.",
    effortEn: "~2 weeks",
    effortIt: "circa 2 settimane",
    triggers: { "mat:none": 5, "mat:pilot": 6, "own:weak": 4 },
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Matching
// ─────────────────────────────────────────────────────────────────────────

/** Collect every signal raised by the user's choices. */
export function answersToSignals(answers: Record<string, string>): Set<string> {
  const signals = new Set<string>();
  for (const [qid, choiceId] of Object.entries(answers)) {
    const q = QUESTIONS.find((x) => x.id === qid);
    const c = q?.choices.find((x) => x.id === choiceId);
    if (c) c.signals.forEach((s) => signals.add(s));
  }
  return signals;
}

/** Score each finding by its trigger weights. Return top N. */
export function matchFindings(answers: Record<string, string>, top = 3): Finding[] {
  const signals = answersToSignals(answers);
  const scored = FINDINGS.map((f) => {
    let score = 0;
    for (const [sig, weight] of Object.entries(f.triggers)) {
      if (signals.has(sig)) score += weight;
    }
    if (score > 0 && f.base) score += f.base;
    return { f, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, top).map((x) => x.f);
}

export const TOTAL_QUESTIONS = QUESTIONS.length;
