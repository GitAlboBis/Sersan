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
 * Cal.com scheduling link. NOTE: placeholder — `cal.com/sersan/scoping-call`
 * does not exist yet and 404s. The Cal embed uses the bare `sersan/scoping-call`
 * slug; this is the full URL for direct links. Do NOT link to this until the
 * real booking link is live.
 */
export const CAL_URL = "https://cal.com/sersan/scoping-call";

/**
 * Master switch for the Cal.com booking embed. While `false`, <CalEmbed/>
 * renders a written-intake / email fallback card and does NOT load the Cal
 * script or hit app.cal.com (avoids the "404 Cal Link" error from the
 * placeholder slug). Set `true` AND replace the slug in <CalEmbed/> with the
 * real Cal.com booking link once it exists to restore the live embed.
 */
export const CAL_ENABLED = false;
