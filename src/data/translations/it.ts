/**
 * The LIVE translation dictionary — Italian.
 *
 * Pruned in lockstep with en.ts (2026-08 repositioning). See that file's header
 * for why 326 orphaned keys were removed rather than maintained. Keys here must
 * mirror en.ts exactly — a key present in one file and missing from the other
 * falls back to the raw key string in the UI.
 *
 * Register: the site addresses the client as "voi" (formal plural).
 *
 * Consumer: src/components/fx/preloader.tsx → preloader.readout
 */
const it = {

    // Readout del preloader al primo caricamento (piano mobile-parity, Decisione 8).
    'preloader.readout': 'Inizializzazione del segnale',
} as const;

export default it;
