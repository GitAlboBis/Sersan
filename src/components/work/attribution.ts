import type { CaseStudy, CaseStudyStatus } from "@/data/case-studies";

/**
 * PROVENANCE RENDERING — the bilingual surface of `attribution` / `status`
 * (repositioning 2026-08).
 *
 * The archive data has carried `attribution`, `attributionPerson`,
 * `attributionVia` and `status` since the 2026-08 data pass, but NOTHING
 * rendered them: the card printed `client` + `domain` only, so /case-studies
 * read as a wall of Revolut / J.P. Morgan / Apple / Accenture / Leonardo /
 * WHO marks with €18M-scale metrics under them, and a deep link to
 * /case-studies/revolut showed an institution logo, a role and no provenance
 * at all. The only honest sentence on the whole surface was a 12px italic
 * disclaimer below the grid.
 *
 * Prior experience is a CREDIBILITY ASSET when it is labelled — depth behind
 * the offer, not the entry bar. Never present a "prior" entry as a SerSan
 * client engagement.
 *
 * Pure string helpers on purpose: `attributionLine` is concatenated into the
 * card's `.fw-line-1` eyebrow, which the entrance types on character by
 * character via `textContent` — so that slot must resolve to exactly ONE
 * text node. No JSX here.
 */

const STATUS_LABEL: Record<CaseStudyStatus, { en: string; it: string }> = {
  live: { en: "Live", it: "Live" },
  "production-beta": { en: "Production beta", it: "Beta in produzione" },
  "client-preview": { en: "Client preview", it: "Anteprima cliente" },
  "private-launch": { en: "Private launch", it: "Lancio privato" },
  implementation: { en: "Implementation", it: "In implementazione" },
  ongoing: { en: "Ongoing development", it: "Sviluppo in corso" },
  planned: { en: "Planned", it: "Pianificato" },
  completed: { en: "Completed", it: "Concluso" },
};

/**
 * `attributionVia` values that are NOT an organisation ("freelance",
 * "research grant", …) and therefore read as an apposition, not "at X".
 * Detected by casing — every organisation in the data is capitalised.
 */
const VIA_IT: Record<string, string> = {
  freelance: "freelance",
  "research grant": "grant di ricerca",
  "co-founder & CTO": "co-founder & CTO",
  "fractional CTO contract": "contratto da CTO frazionale",
};

/** Delivery status, precise and never rounded up. */
export function statusLabel(status: CaseStudyStatus, isEn: boolean): string {
  const entry = STATUS_LABEL[status];
  return isEn ? entry.en : entry.it;
}

/**
 * "SerSan delivery" · "Prior experience — Michele Sanna at Revolut" ·
 * "Prior experience — Michele Sanna, freelance".
 */
export function attributionLine(study: CaseStudy, isEn: boolean): string {
  if (study.attribution === "sersan") {
    return isEn ? "SerSan delivery" : "Delivery SerSan";
  }
  const lead = isEn ? "Prior experience" : "Esperienza precedente";
  const person = study.attributionPerson;
  const via = study.attributionVia;
  if (person && via) {
    /* An organisation takes "at / presso"; a mode of engagement is an
       apposition ("Michele Sanna, freelance"). */
    if (/^[A-Z]/.test(via)) {
      return `${lead} — ${person} ${isEn ? "at" : "presso"} ${via}`;
    }
    return `${lead} — ${person}, ${isEn ? via : VIA_IT[via] ?? via}`;
  }
  if (person) return `${lead} — ${person}`;
  if (via) {
    return isEn
      ? `${lead} — delivered through ${via}`
      : `${lead} — tramite ${VIA_IT[via] ?? via}`;
  }
  return lead;
}

/**
 * English-only page title for a shared link or a search result. A "prior"
 * entry LEADS with the qualifier so a truncated SERP row still cannot read
 * as a SerSan client engagement.
 */
export function attributionTitle(study: CaseStudy): string {
  return study.attribution === "prior"
    ? `Prior experience: ${study.client} — ${study.engagement}`
    : `${study.client}, ${study.engagement}`;
}
