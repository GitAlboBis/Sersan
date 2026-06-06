import { ImageResponse } from "next/og";
import { caseStudies } from "@/data/case-studies";

export const alt = "Sersan case study";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Dynamic OG image per case study. Editorial brass-and-midnight card:
 * mono eyebrow (industry), display headline (case study name), small
 * Sersan signature. Generated on-build, served as static PNG.
 */
export default async function Image({ params }: { params: { slug: string } }) {
  const study = caseStudies.find((cs) => cs.id === params.slug);
  const title = study?.client ?? "Case study";
  const industry = study?.industry ?? "Engineering";
  const metric =
    study?.metrics?.[0]
      ? `${study.metrics[0].value} · ${study.metrics[0].label}`
      : "";

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
        {/* Top eyebrow */}
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
          Case study · {industry}
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            maxWidth: 1000,
          }}
        >
          <div style={{ fontSize: 78, lineHeight: 1.05, letterSpacing: -1.5 }}>
            {title}
          </div>
          {metric && (
            <div
              style={{
                fontSize: 30,
                fontStyle: "italic",
                color: "#d4a878",
              }}
            >
              {metric}
            </div>
          )}
        </div>

        {/* Footer rule + signature */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 30,
            borderTop: "1px solid rgba(212, 168, 120, 0.35)",
          }}
        >
          <div
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 14,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#a5adb8",
            }}
          >
            sersan.io
          </div>
          <div
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 14,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#a5adb8",
            }}
          >
            AI-powered software engineering
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
