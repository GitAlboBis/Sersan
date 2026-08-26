import { ImageResponse } from "next/og";
import { resources } from "@/data/resources";

export const alt = "Sersan field notes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Dynamic OG image per article. Editorial brass-and-midnight card.
 */
export default async function Image({ params }: { params: { slug: string } }) {
  const article = resources.find((r) => r.slug === params.slug);
  const title = article?.title ?? "Field notes";
  const category = (article?.category ?? "Article").replace(/-/g, " ");

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
          Field notes · {category}
        </div>

        <div style={{ fontSize: 76, lineHeight: 1.08, letterSpacing: -1.5, maxWidth: 1020 }}>
          {title}
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
          <div>sersan.io / writing</div>
          <div>Notes from the build, plainly written</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
