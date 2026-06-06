/**
 * Site-wide constants — single source of truth for contact details and
 * primary call-to-action destinations. Import from `@/lib/site` instead of
 * hardcoding emails / hrefs across components.
 */

/** Canonical contact email. Used for mailto links and "email us" copy. */
export const CONTACT_EMAIL = "alex.s@sersan.dev";

/** Primary CTA destination — the scoping-call intake page. */
export const START_HREF = "/start";

/**
 * Cal.com scheduling link. The Cal embed uses the bare `sersan/scoping-call`
 * slug; this is the full URL for direct links.
 */
export const CAL_URL = "https://cal.com/sersan/scoping-call";
