/**
 * Data + matching logic for the /audit 60-second self-audit.
 *
 * Five business-shaped questions — manual work, tools that don't talk to
 * each other, information trapped in documents, a process nobody trusts,
 * software that has outgrown itself. AI is ONE possible answer among
 * conventional software and automation, never the destination.
 *
 * Each answer carries one or more `signal` tags. After Q5 we match those
 * signals against a bank of possible first-moves (findings) and surface the
 * top 3 by priority. COUNTS ARE LOAD-BEARING: five questions, seven
 * findings — the stage choreography in ../app/audit/self-audit.tsx is
 * count-driven. Change the copy, never the arity, the ids or the signals.
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
    promptEn: "How much of this work is handled by software today?",
    promptIt: "Quanta parte di questo lavoro è gestita da software oggi?",
    choices: [
      { id: "none",     labelEn: "Almost none — people, spreadsheets, email",   labelIt: "Quasi niente: persone, fogli di calcolo, email",  signals: ["mat:none"] },
      { id: "pilot",    labelEn: "A few tools, loosely connected",                labelIt: "Qualche strumento, collegato alla meglio",        signals: ["mat:pilot"] },
      { id: "feature",  labelEn: "One system does most of it",                    labelIt: "Un sistema fa quasi tutto",                        signals: ["mat:feature"] },
      { id: "multi",    labelEn: "Several systems, all in daily use",             labelIt: "Più sistemi, tutti in uso quotidiano",             signals: ["mat:multi"] },
    ],
  },
  {
    id: "killswitch",
    promptEn: "When something goes wrong in the process, how do you find out?",
    promptIt: "Quando qualcosa va storto nel processo, come ve ne accorgete?",
    choices: [
      { id: "yes",     labelEn: "Automatically, before the customer does",       labelIt: "In automatico, prima del cliente",                signals: ["ks:yes"] },
      { id: "partial", labelEn: "Sometimes — depends who's looking",              labelIt: "A volte, dipende da chi sta guardando",           signals: ["ks:partial"] },
      { id: "no",      labelEn: "A customer or a colleague tells us",            labelIt: "Ce lo dice un cliente o un collega",              signals: ["ks:no"] },
      { id: "na",      labelEn: "It's all manual, nothing to monitor",           labelIt: "È tutto manuale, non c'è nulla da monitorare",     signals: ["ks:na", "mat:none"] },
    ],
  },
  {
    id: "evals",
    promptEn: "How do you know the output is right before it goes out?",
    promptIt: "Come sapete che il risultato è corretto prima che esca?",
    choices: [
      { id: "ci",      labelEn: "Automated checks catch the mistakes",           labelIt: "Controlli automatici intercettano gli errori",    signals: ["eval:strong"] },
      { id: "manual",  labelEn: "Someone reviews a sample",                      labelIt: "Qualcuno controlla a campione",                   signals: ["eval:weak"] },
      { id: "vibes",   labelEn: "We rely on people being careful",               labelIt: "Contiamo sull'attenzione delle persone",          signals: ["eval:none"] },
      { id: "ship",    labelEn: "We find out when it's already wrong",           labelIt: "Ce ne accorgiamo quando è già sbagliato",         signals: ["eval:none"] },
    ],
  },
  {
    id: "cost",
    promptEn: "Do you know what this process costs you each month?",
    promptIt: "Sapete quanto vi costa ogni mese questo processo?",
    choices: [
      { id: "perreq",  labelEn: "Yes — hours and money, measured",                labelIt: "Sì: ore e denaro, misurati",                      signals: ["cost:strong"] },
      { id: "aggr",    labelEn: "Roughly, from an estimate",                     labelIt: "All'incirca, a stima",                            signals: ["cost:weak"] },
      { id: "surprise",labelEn: "Only when it goes badly wrong",                 labelIt: "Solo quando va davvero male",                     signals: ["cost:none"] },
      { id: "dunno",   labelEn: "Never actually worked it out",                  labelIt: "Non l'abbiamo mai calcolato",                     signals: ["cost:none"] },
    ],
  },
  {
    id: "owner",
    promptEn: "Who owns this process today?",
    promptIt: "Chi è responsabile di questo processo oggi?",
    choices: [
      { id: "ml",      labelEn: "One person, clearly, with time for it",         labelIt: "Una persona, chiaramente, e con il tempo",        signals: ["own:strong"] },
      { id: "backend", labelEn: "Someone technical, on top of their day job",    labelIt: "Qualcuno di tecnico, oltre al proprio lavoro",    signals: ["own:weak"] },
      { id: "pm",      labelEn: "An operations or product person",               labelIt: "Una persona di operations o prodotto",            signals: ["own:weak"] },
      { id: "none",    labelEn: "Nobody, really",                                labelIt: "In realtà nessuno",                                signals: ["own:none"] },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Findings bank
// ─────────────────────────────────────────────────────────────────────────

export const FINDINGS: Finding[] = [
  {
    id: "killswitch",
    nameEn: "Make failures visible",
    nameIt: "Rendere visibili i guasti",
    descEn:
      "Work never silently disappears. Anything that can't complete is captured, surfaced and safely retried — with an alert that reaches a person, not a log nobody opens.",
    descIt:
      "Il lavoro non sparisce mai in silenzio. Ciò che non riesce a completarsi viene intercettato, segnalato e ritentato in sicurezza, con un alert che arriva a una persona, non in un log che nessuno apre.",
    effortEn: "~1 week",
    effortIt: "circa 1 settimana",
    triggers: { "ks:no": 12, "ks:partial": 8 },
  },
  {
    id: "evals",
    nameEn: "A check before it goes out",
    nameIt: "Un controllo prima che esca",
    descEn:
      "Automated checks on the output, run every time, so mistakes are caught before a customer sees them instead of after. The rules come from your own past errors.",
    descIt:
      "Controlli automatici sull'output, eseguiti ogni volta, così gli errori si intercettano prima che li veda un cliente e non dopo. Le regole nascono dai vostri errori passati.",
    effortEn: "~2 weeks",
    effortIt: "circa 2 settimane",
    triggers: { "eval:none": 12, "eval:weak": 7 },
  },
  {
    id: "cost",
    nameEn: "Put a number on it",
    nameIt: "Mettere un numero sul problema",
    descEn:
      "Measure what the process really costs in hours and money before changing anything, so the business case is arithmetic rather than opinion — and so you can tell whether the fix worked.",
    descIt:
      "Misurare quanto costa davvero il processo, in ore e in denaro, prima di cambiare qualsiasi cosa: così il business case è aritmetica e non opinione, e si capisce se la soluzione ha funzionato.",
    effortEn: "~1 week",
    effortIt: "circa 1 settimana",
    triggers: { "cost:none": 10, "cost:weak": 5 },
  },
  {
    id: "observability",
    nameEn: "See what's actually running",
    nameIt: "Vedere cosa sta davvero girando",
    descEn:
      "One place that shows the state of the work: what's queued, what's stuck, what's slow, who's waiting. Alerts that reach a named person, so problems surface before customers do.",
    descIt:
      "Un unico posto che mostra lo stato del lavoro: cosa è in coda, cosa è bloccato, cosa è lento, chi sta aspettando. Alert che arrivano a una persona precisa, così i problemi emergono prima dei clienti.",
    effortEn: "~2 weeks",
    effortIt: "circa 2 settimane",
    triggers: { "mat:multi": 10, "own:none": 8, "own:weak": 5 },
  },
  {
    id: "architecture",
    nameEn: "The smallest useful build",
    nameIt: "La soluzione utile più piccola",
    descEn:
      "A scoped first version that solves one painful problem end to end — designed so it can grow, but priced and shipped as the small thing it is. Conventional software, automation or AI, whichever fits.",
    descIt:
      "Una prima versione a scope definito che risolve un solo problema doloroso dall'inizio alla fine: progettata per poter crescere, ma con prezzo e tempi della cosa piccola che è. Software tradizionale, automazione o AI, a seconda di cosa serve.",
    effortEn: "~2 weeks",
    effortIt: "circa 2 settimane",
    triggers: { "mat:none": 14, "mat:pilot": 8 },
  },
  {
    id: "ownership",
    nameEn: "Someone technical, accountable",
    nameIt: "Un responsabile tecnico, con un nome",
    descEn:
      "You don't need to hire a CTO to get technical ownership. A named engineer owns the roadmap, the decisions and whatever is running, for as long as it's useful — then hands it back documented.",
    descIt:
      "Non serve assumere un CTO per avere una vera proprietà tecnica. Un ingegnere con nome e cognome si prende in carico roadmap, decisioni e ciò che è in funzione, finché serve, e poi ve lo restituisce documentato.",
    effortEn: "Monthly, rolling",
    effortIt: "mensile, rinnovabile",
    triggers: { "own:none": 12 },
  },
  {
    id: "enablement",
    nameEn: "A handover your team can use",
    nameIt: "Un passaggio di consegne utilizzabile",
    descEn:
      "Short written documentation of how the system works, what to do when it doesn't, and how to change the parts you'll want to change. Plus a working session with the people who'll use it.",
    descIt:
      "Documentazione scritta e breve su come funziona il sistema, cosa fare quando non funziona e come modificare le parti che vorrete modificare. Più una sessione di lavoro con chi lo userà.",
    effortEn: "~1 week",
    effortIt: "circa 1 settimana",
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
