import { ImageResponse } from "next/og";

export const alt =
  "SerSan — custom software, workflow automation and AI for growing businesses";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Default OG image for the root. Editorial midnight signature card matching the
 * site's hero treatment, with the mark set on the right.
 *
 * The outline is the same geometry as src/components/sersan-logo.tsx — inlined
 * rather than imported because this renders through Satori, which takes a
 * standalone element tree and no client bundle.
 */
const MARK_UPPER =
  "M 81.19 0 L 162.38 46.88 L 127.3 67.13 L 81.19 40.51 L 39.64 64.49 L 39.64 90.03 L 80.11 113.4 L 40.6 136.21 L 0 112.78 L 0 46.88 Z";
const MARK_LOWER =
  "M 81.19 200 L 0 153.13 L 35.08 132.87 L 81.19 159.49 L 122.73 135.51 L 122.73 109.97 L 82.27 86.6 L 121.78 63.79 L 162.38 87.22 L 162.38 153.13 Z";
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background:
            "linear-gradient(135deg, #0e1424 0%, #142036 60%, #1a2740 100%)",
          color: "#f3f1ec",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 18,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: "#3BE1FF",
            fontFamily: "ui-monospace, monospace",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: "#3BE1FF",
              display: "block",
            }}
          />
          Custom software · automation · AI · London
        </div>

        <div
          style={{
            position: "absolute",
            right: 86,
            top: 176,
            display: "flex",
          }}
        >
          <svg width="228" height="281" viewBox="0 0 162.38 200">
            <path d={MARK_UPPER} fill="#F4F6FA" />
            <path d={MARK_LOWER} fill="#2A7FFF" />
          </svg>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 92, lineHeight: 0.98, letterSpacing: -2, maxWidth: 1000 }}>
            Start with the problem.
          </div>
          <div
            style={{
              fontSize: 72,
              lineHeight: 1,
              letterSpacing: -1.5,
              fontStyle: "italic",
              color: "#7E8CA3",
              maxWidth: 1000,
            }}
          >
            Build what earns its place.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 30,
            borderTop: "1px solid rgba(59, 225, 255, 0.28)",
            fontFamily: "ui-monospace, monospace",
            fontSize: 14,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#a5adb8",
          }}
        >
          <div>sersan.io</div>
          <div>Scoped before we build · you own what we build</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
