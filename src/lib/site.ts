/**
 * Site-wide constants — single source of truth for contact details and
 * primary call-to-action destinations. Import from `@/lib/site` instead of
 * hardcoding emails / hrefs across components.
 */

/**
 * Canonical contact email. Used for mailto links and "email us" copy.
 *
 * REVERTED 2026-09-04 on the owner's instruction ("il capo mi ha detto di
 * mettere la nuova mail nel sito"): back to `alex.s@sersan.dev`.
 *
 * THIS UNDOES A DELIBERATE AUGUST DECISION — read before changing it again.
 * 2026-08 moved the published address to `info@sersan.io` for three stated
 * reasons, and every one of them is still true:
 *   1. it is a PERSONAL mailbox, so it does not survive that founder being
 *      unavailable, while the site's own copy promises a reply in one
 *      business day;
 *   2. it is on a NON-CANONICAL domain — the site is sersan.io end to end
 *      (BASE in sitemap.ts, ops@sersan.io as the outbound sender), so the
 *      one address a visitor is asked to write to is now the only sersan.dev
 *      string on the site;
 *   3. it publishes to ~54 render sites across 17 files.
 * The August note also recorded an ACTION REQUIRED that may never have been
 * done — `info@sersan.io` had to exist and be monitored before it shipped. If
 * it was never created, this revert is the correct fix and the reasons above
 * are the price; if it WAS created, the better fix is to keep the role
 * address and forward it to alex.s@sersan.dev.
 *
 * NOTE the collision this creates: OPS_EMAIL_FALLBACK below is the SAME
 * address, and the comment there explains why publishing and delivery are
 * deliberately different jobs that fail differently. They are now one
 * mailbox — if it breaks, the published address and the lead delivery break
 * together. Setting OPS_EMAIL in the environment restores the separation.
 */
export const CONTACT_EMAIL = "alex.s@sersan.dev";

/**
 * Where form submissions are DELIVERED. Deliberately separate from
 * CONTACT_EMAIL, which is the address we PUBLISH.
 *
 * These are different jobs and they fail differently. A published address that
 * bounces is visible and embarrassing; a delivery address that bounces loses
 * leads silently, on the only working conversion path on the site. So the
 * fallback here stays a mailbox that is known to receive mail today, and it is
 * overridden in the environment rather than edited in source.
 *
 * SET `OPS_EMAIL` IN THE ENVIRONMENT. Once info@sersan.io is live and
 * monitored, set OPS_EMAIL to it and this fallback becomes dead weight.
 */
export const OPS_EMAIL_FALLBACK = "alex.s@sersan.dev";

/** Primary CTA destination — the written project-brief intake page. */
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
