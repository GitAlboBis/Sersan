# ROUND 10 — THE IMMERSIVE JOURNEY: MASTER SPEC (the entry point)

**Read this first, then the two halves it names.** This file exists to (1) point at the
two dossiers, (2) record the owner's binding decisions, and (3) resolve the one place
where the two halves disagree. It adds no new design of its own.

Written by the main session, 2026-08-24, after both research halves landed.

---

## THE THREE DOCUMENTS

| | file | owns |
|---|---|---|
| **the film** | `2026-08-22-round10-journey-storyboard.md` (72 KB) | through-line, 14-beat sheet, copy choreography, value world, legibility law, three viewports, RM |
| **the rig** | `2026-08-22-round10-journey-mechanism.md` (71 KB) | the camera decision, the scroll to pose contract, frame order, budget, file-by-file changes, risks, rollout |
| **the calls** | `2026-08-22-round10-OWNER-DECISIONS.md` | what the owner has ruled on, and what is still open |

Plus the session brief they both answer to: `2026-08-22-ROUND10-HANDOFF.md`.

---

## THE HEADLINE FINDING — none of the three camera options worked

The handoff put three options on the table (SignatureLine journey mode / a second camera
authority with a handover / the world moves past a static camera). The mechanism dossier
audited every island's placement line and found **all three are no-ops for the four
islands that must move.**

`NeuralLattice.tsx:374-379` and `CrystalCluster.tsx:487-494` both recompute their group
pose from the camera *every frame*:

    group.position = camera.position + camera.quaternion * (screenOffset*k, ., -CAMERA_Z)
    group.quaternion = camera.quaternion

A group re-derived from the camera pose each frame is **exactly invariant under camera
translation AND rotation**, and a world-root translation moves it not at all because it is
parented to nothing. Options (a) and (b) would have shipped a journey where the signature
tube and the dust swoop while the net and the stone sit **bolted to the glass**. Option (c)
is a strictly weaker (a) — there is no world root, and it still moves none of the four.

**The answer is option (d): a local dolly rig.** Each participating island keeps its
camera-locked outer group as a HUD anchor and gains ONE new intermediate `<group>` between
that outer group and its existing inner group. That group carries the journey — travel
along the view axis, lateral/diagonal drift, rotation — as a pure function of band
progress, read with `getState()` in the island's existing `useFrame`.

**SignatureLine changes by zero lines and remains the only camera writer, literally.**
No second authority, no handover protocol, no world root. The perspective divide is
identical (the transform is Galilean) and `neuralFieldCompute.ts:2207-2211` already divides
sprite size by real view-space distance, so the dolly gives correct perspective growth with
no shader change.

Participating set: `NeuralLattice` x2 and `CrystalCluster` x2. Travelling for free with no
code at all: the signature tube and the ~320 dust motes that stream past while the DOM is
pinned (`SignatureLine.tsx:787` keeps gliding the camera off `scrollY` throughout).

---

## THE STAGE

The band becomes a `.seq-stage`-class **CSS sticky, full-viewport stage** over a lengthened
runway — the grammar this site already ships four times (`singularity-passage.tsx:2529`,
`cinematic-system-scroll.tsx:1697`, `fit-section.tsx:1308`, `services-section.tsx:1319`).

**Never ScrollTrigger `pin:`. Never scroll hijacking. Never a parking settle.** The page
moves at natural speed the whole way through; the dwell inside a beat belongs to the
reader, not to a timer.

---

## THE RECONCILIATION — beat count

**The two halves disagree and this is the ruling.**

- The storyboard designs **7 beats per act** at a variable pitch (0.40–0.90 vh, mean 0.73):
  Act I 6.10 vp = 4392 px, Act II 5.95 vp = 4284 px, so **+5871 px, +27.4%**.
- The mechanism dossier priced a flat `BEAT_VH = 0.80` ladder and recommended
  **`BEATS = 4`** (+15.1%) for stage 1. It was written before the owner ruled.

**The owner approved the 7-beat film and the 27.4% bill explicitly** (OWNER-DECISIONS D1).
The mechanism dossier's `BEATS = 4` recommendation is **superseded**; its arithmetic is not
— the flat ladder was a pricing instrument, and the storyboard's variable pitch is the
finer number.

**Ruling:**

1. **The runway ships at the approved length from stage 1** — Act I 6.10 vp, using the
   storyboard's per-beat windows, not a flat 0.80 pitch. Rationale: stage 1 exists so the
   owner can judge the feel, and a feel calibrated on a 15% runway is not the thing he
   approved. He must scroll the real distance.
2. `BEATS`, `BEAT_VH` and the per-beat window table are **one-line config and live-tunable**
   through the dev handle from stage 1. If the empty stage reads long, the lever exists and
   is cheap — but it is his lever to pull, in Chrome, not a default we choose for him.
3. Stage 1 shows **no beats at all** (empty stage, no dolly), so the beat count affects only
   the runway length and the streaming duration. Nothing else in stage 1 depends on it.

---

## THE ROLLOUT (mechanism dossier Part 12, with the ruling applied)

| stage | what | gate |
|---|---|---|
| **1** | `#problem` only: `journeyStore`, `use-journey-stage`, sticky stage + runway **at the approved Act I length**, the sticky-offset correction (R1), the drift/replay gate (R2). No dolly, no beats. | projected group centre constant within 2 px at p = 0.1/0.5/0.9; copy blocks keep their gap at p = 0.05/0.95; a capture across the stage shows tube + dust streaming — **this is the "quasi un video" beat and it is what to show the owner**; `tsc` clean; `#trust` byte-identical |
| **2** | the dolly rig on `NeuralLattice` (`#problem`) | apparent net height matches `7428.3/d` px within 3%; at least 55 fps at the deepest pose at DPR 1.5; `AdaptiveResolution` does not floor DPR |
| **3** | copy beats + the `uCopyEdge` to `uCopyBeat` mask swap | travel beat: ~100% of nodes visible at 1280 **and at 390** (today 30% / ~0%); copy beat: `--ink-mute` at least 4.5:1 with the net at its brightest; each row plays once on its own beat and replays on reverse scrub |
| **4** | `CrystalCluster` joins the rig; the meteorite gets its beat | callout vars within 1% of projected anchors at every beat; apparent stone height under the Part 11.3 cap; tumble deadzone still settles upright |
| **5** | the same hook on `#trust` with the healthy beat table | the two bands read as one system at matching beats; `/#trust` deep-link lands at p near 0; page height and Lighthouse mobile re-measured |

**Cold-restart discipline at every stage** (handoff trap 5.1): `preview_stop` then
`preview_start`. HMR does not rebuild the WebGL island and this project has already lost a
round to that.

---

## THE THREE RISKS THAT CAN SILENTLY DESTROY IT

- **R1 — the sticky-offset omission.** `vpTop = rect.docTop - scrollY` assumes normal flow;
  under a sticky ancestor the net slides out of frame while the band stays pinned. A 3-line
  fix that is **invisible in review** and fatal on screen. Mechanism dossier Part 4.4 is
  mandatory reading before a line of stage 1 is written.
- **R2 — `useTextDrift` / `createReplayTrigger` breakage.** `useTextDrift` reads
  `window.scrollY` for an element that no longer moves with the page: up to ±172.8 px of
  runaway drift and 345.6 px of block separation over a 4-beat stage. Quantified in Part 3.4.
- **R3 — fill blow-out** at the deep dolly poses: 5.4x at the deepest, unmeasured. Stage 2's gate.

---

## WHAT THE JOURNEY RETIRES

The round-9-B copy-column plexus mask (mechanism Part 11.1). Today, for body copy to clear
AA the plexus is masked to ~1% over the copy column — which at 1280 floors ~70% of the nodes
and at 390 floors essentially all of them (mean node mask 0.002; the phone net is invisible).
The journey retires that mask because **time replaces the mask**: on a travel beat there is
no copy on screen, so the net can run at full value; on a copy beat the net has yawed and
dollied off the type column, so it does not need suppressing. **The phone band comes back.**

That is the single biggest measured win in this round, and it is why the redesign is not
optional polish.
