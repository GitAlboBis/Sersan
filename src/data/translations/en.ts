/**
 * The LIVE translation dictionary — English.
 *
 * This file once held 331 keys, of which 326 were orphaned. The site has no
 * translation framework in practice: its real i18n is ~437 inline
 * `isEn ? "EN" : "IT"` ternaries across 40 components, and `t()` now has a
 * single caller.
 *
 * The dead keys were not harmless. They were shipped source asserting things
 * the site does not claim anywhere else — an unhedged
 * `'hero.compliance': 'GDPR & ISO 27001 aligned'` (SerSan holds no
 * certification) and a `'founders.andrea.bio'` written for a person who is not
 * on the team, misattributing a satellite programme to the wrong employer.
 *
 * Pruned in the 2026-08 repositioning (the repo's own IMPROVEMENT_BACKLOG item
 * B6). The `cal.fallback.*` block went in the same pass: the booking-embed
 * fallback card now carries its copy inline in `cal-embed.tsx`, which is the
 * site's actual convention and keeps that copy next to its Italian twin.
 *
 * If you add a key here it must have a `t()` caller in the same commit.
 * Otherwise put the copy inline in the component, beside its Italian twin.
 *
 * Consumer: src/components/fx/preloader.tsx → preloader.readout
 */
const en = {

    // First-load preloader readout (mobile-parity plan, owner Decision 8).
    // "52. SERSAN" is a tag, not copy — it stays untranslated in the component.
    'preloader.readout': 'Initialising signal',
} as const;

export default en;
