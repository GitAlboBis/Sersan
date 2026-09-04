/**
 * Brand type stack, identical to the site (src/app/layout.tsx):
 *  - SersanDisplay  — patched Jost (no-crossbar A, open-bowl R), the wordmark only
 *  - Switzer        — body sans (local woff2)
 *  - Fraunces       — editorial serif for headlines (Google Fonts, optical sizing)
 *  - JetBrains Mono — eyebrows, labels, tabular numerics (Google Fonts)
 *
 * Every loader blocks rendering (delayRender) until the face is ready, so no
 * frame can ever be captured with a fallback font.
 */
import { loadFont as loadLocal } from "@remotion/fonts";
import { staticFile } from "remotion";
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadJetBrains } from "@remotion/google-fonts/JetBrainsMono";

const fraunces = loadFraunces("normal", { weights: ["300", "400", "500"], subsets: ["latin"] });
loadFraunces("italic", { weights: ["300", "400"], subsets: ["latin"] });
const jbm = loadJetBrains("normal", { weights: ["400", "500"], subsets: ["latin"] });

const DISPLAY_WEIGHTS = [200, 220, 240, 260, 280, 300, 340];
const SWITZER_WEIGHTS = [300, 400, 500, 600];

export const fontsReady = Promise.all([
  ...DISPLAY_WEIGHTS.map((w) =>
    loadLocal({ family: "SersanDisplay", url: staticFile(`fonts/sersan-display-${w}.woff2`), weight: String(w) }),
  ),
  ...SWITZER_WEIGHTS.map((w) =>
    loadLocal({ family: "Switzer", url: staticFile(`fonts/switzer-${w}.woff2`), weight: String(w) }),
  ),
]);

export const FONT = {
  brand: "SersanDisplay, Switzer, sans-serif",
  sans: "Switzer, system-ui, sans-serif",
  display: `${fraunces.fontFamily}, Georgia, serif`,
  mono: `${jbm.fontFamily}, ui-monospace, monospace`,
} as const;