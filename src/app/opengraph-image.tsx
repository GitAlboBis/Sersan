import { ImageResponse } from "next/og";

export const alt = "Sersan — AI-powered software engineering for fintech, SaaS & tech";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Default OG image for the root. Editorial brass-and-midnight signature
 * card matching the site's hero treatment.
 */
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
            color: "#d4a878",
            fontFamily: "ui-monospace, monospace",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: "#d4a878",
              display: "block",
            }}
          />
          AI-powered software engineering · London
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 92, lineHeight: 0.98, letterSpacing: -2, maxWidth: 1000 }}>
            We build AI-powered software.
          </div>
          <div
            style={{
              fontSize: 72,
              lineHeight: 1,
              letterSpacing: -1.5,
              fontStyle: "italic",
              color: "#d4a878",
              maxWidth: 1000,
            }}
          >
            It has to run at 3am.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 30,
            borderTop: "1px solid rgba(212, 168, 120, 0.35)",
            fontFamily: "ui-monospace, monospace",
            fontSize: 14,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#a5adb8",
          }}
        >
          <div>sersan.io</div>
          <div>From £15K · scoped weekly · no multi-year retainers</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
