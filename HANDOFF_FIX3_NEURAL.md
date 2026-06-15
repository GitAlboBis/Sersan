# HANDOFF — FIX 3: rete neurale 3D di particelle (Problem + ProductionGrade)

> Documento per **continuare da un altro PC / da una nuova sessione**. Aggiornato: 2026-06-15.
> Le sessioni Claude Code e la memoria NON si sincronizzano tra PC: viaggia solo il **repo git**. Questo file è committato, quindi lo ritrovi facendo `git pull` del branch.

## Come riprendere su un altro PC
1. Sull'altro PC: clona/aggiorna il repo e passa al branch **`feat/webgl-refactor`** (i commit di questo lavoro sono lì; `master` è pinnato al baseline).
   - Se il branch non è ancora su `origin` (policy: push solo su richiesta), va **pushato da questo PC** prima: `git push -u origin feat/webgl-refactor`.
2. Apri Claude Code nella cartella del progetto e dai come primo messaggio: *"Leggi `HANDOFF_FIX3_NEURAL.md` e lo spec, riprendiamo da lì."*
3. Lo **spec completo** (storia delle 5 iterazioni + contratto + costanti) è in:
   `.trellis/tasks/06-06-webgl-visual-refactor-.../research/fix3-neural-particle-field-spec.md`

## Stato attuale (DONE, committato, NON pushato)
Branch `feat/webgl-refactor`. Commit di questo lavoro (dal più recente):
- **`b2b173a`** — v5: rete neurale = **centrotavola** 3D, **card spostate di lato** (mai sovrapposte), il **NODO** è il trigger: hover/focus sul marker → si apre la card + **burst di particelle** sull'hub.
- **`d532ea4`** — v4 (checkpoint): rete interattiva a 3 nodi ancorati alle card + `NeuralCard` (glass) + `store.hovered`.
- **`22e0a8c`** — fix crash: `NeuralLattice` scriveva su `uPulse.value` (null pre-compile) invece di `uPulse.array`. Era la causa per cui l'effetto non si vedeva.

Verificato dal vivo su WebGPU (Chrome): entrambe le sezioni renderizzano, hover-nodo apre la card e accende/burst l'hub, console pulita (resta solo un warning preesistente `THREE.Clock deprecated`), `npx tsc --noEmit` pulito.

## Cosa fa l'effetto (design finale v5)
- **Rete neurale 3D di particelle** come centrotavola visibile: 3 hub luminosi a **triangolo** (non in fila) connessi da archi cyan curvi (Bézier con bow in profondità) + segnale che scorre; cyan→violet sul path del bloom selettivo; profondità reale (hub a z diversi) + parallax/auto-orbit.
- **3 card in colonna laterale**, offset dalla rete, compatte di default (occhiello + titolo).
- **Interazione**: hover/focus/tap sul **marker del nodo** → `setHovered(surface, i)` → l'hub `i` fa flare + **burst** (espansione particellare one-shot, emissive spike, segnale che accelera), gli altri si attenuano, e la **card `i` si apre** col dettaglio. Le card si aprono anche sul proprio hover/focus (ridondanza accessibile).
- **Problem** = modalità "broken" (percorso che si frattura); **ProductionGrade** = "healthy" (pulse sequenziale eval→trace→guardrail).
- **Responsive**: griglie `[centrotavola | card]` che si impilano in verticale su schermi stretti; copy congelata; reduced-motion safe.

## Mappa file
- `src/webgl/NeuralLattice.tsx` — island R3F: camera-lock al rect della sezione, misura i marker `[data-lattice-node]` → uniform `uHub0/1/2`, guida burst/glow/uniformi, debug handle.
- `src/webgl/neural/neuralFieldCompute.ts` — build particellare (compute WebGPU + fallback statico): hub a sfera, archi Bézier, segnale, `uHubBurst`/`uHubGlow`, materiale additivo emissive>1.
- `src/webgl/neural/neuralLatticeConfig.ts` — TUTTE le costanti "look" (count, frazioni, raggi, z degli hub, `NEURAL_ARC_BOW`, burst `HOVER_BURST_*`, parallax, spring, signal). **Qui si tunano i numeri.** Mantiene anche `buildLatticeLayout` per il fallback SVG.
- `src/webgl/store/neuralLatticeStore.ts` — store globalThis-pinned: `hovered`/`setHovered` (non decaduto) + `bump`/`bumpCluster`/`setPulse` (sequenza in-view).
- `src/components/fx/neural-centerpiece.tsx` — area rete: `[data-lattice-anchor]`, fallback SVG, 3 marker assoluti.
- `src/components/fx/neural-node-marker.tsx` — il `<button>` focusabile = nodo (porta `data-lattice-node`, `aria-controls`/`aria-expanded`, label 01/02/03, drive `setHovered`).
- `src/components/fx/neural-card.tsx` — `NeuralCard` condivisa (glass cyan→violet), si apre dall'indice `hovered`.
- `src/components/sections/problem-section.tsx` / `production-grade-section.tsx` — layout `[centrotavola | card]`.
- `src/app/globals.css` — chrome `.neural-card` e `.neural-node-marker`.

## Come girare + QA
- Dev: `npm run dev` (Next 16 / Turbopack). Flag **`NEXT_PUBLIC_WEBGPU=1`** già in `.env.local` (serve per montare l'island; senza, parte il fallback SVG).
- L'island monta solo su **home `/` + tier `full` + WebGPU** (desktop). Su lite/mobile/reduced-motion → fallback SVG + card DOM.
- **Quirk preloader (Chrome headless/tab in background)**: il rAF è throttlato → il preloader sembra "fermo"; basta un click/scroll (gesture) per sbloccarlo. Il `uReveal` sale solo mentre scrolli.
- **Debug handle** in dev: `window.__sersanNeuralLattice_problem` / `_production` → `{ mode, hasBuild, webgpu, rect, hubs, uReveal, hubGlow, hubBurst, project() }`. Store: `window.__sersanNeuralLattice.getState()`.

## Gotcha tecnici da NON ri-sbagliare (three@0.184 / WebGPU TSL)
- Lettura storage in render: **`.toAttribute().xyz`** (swizzle obbligatorio). `.element(i)` SOLO nei compute kernel (rompe su WebGL2 sub-backend, three #31221).
- `uniformArray`: scrivere su **`.array[i]`**, non `.value[i]` (`.value` è il buffer paddato, null pre-compile → era il crash).
- Backend guard compute: `backend.isWebGLBackend !== true && typeof gl.compute === 'function'`.
- Import `three/webgpu`+`three/tsl` SOLO dentro l'effect gated da `webgpuEnabled()` (mai a module scope).
- `const delta = Math.min(rawDelta, 1/30)`.
- Camera-lock: l'island NON scrive mai la camera (single authority = `SignatureLine`); posizione+quaternion dal rect, scale dal rect; ruota solo il group interno.

## Aperti / prossime rifiniture (proposte all'utente)
1. Etichette 01/02/03 a volte si sovrappongono alle particelle dell'hub → ripulire posizionamento marker.
2. Intensificare burst + animazione apertura card (scia nodo→card più marcata).
3. Modalità **broken**: rendere più leggibile frattura/dispersione del percorso morto.
4. **Mobile/no-WebGPU**: il fallback SVG è ancora la vecchia grafica → allinearlo alla nuova rete a 3 nodi.

## Note
- Push: **non ancora fatto** (policy: push solo su richiesta). Per usarlo sull'altro PC va pushato `feat/webgl-refactor`.
- Restano modifiche pre-esistenti NON di questo lavoro (non committate): `AGENTS.md`, `case-studies-rail.tsx`, `sersan-logo.tsx`, `see-more-portal.tsx`, alcune research `flip-*.md`. Lasciate intatte di proposito.
