"use client";

// TODO: replace placeholder Cal.com slug with the real Sersan booking link.
import { useEffect } from "react";
import Cal, { getCalApi } from "@calcom/embed-react";
import { useLanguage } from "@/components/language-provider";

interface CalEmbedProps {
  slug?: string;
  theme?: "dark" | "light" | "auto";
  hideEventTypeDetails?: boolean;
}

export function CalEmbed({
  slug = "sersan/scoping-call",
  theme = "dark",
  hideEventTypeDetails = false,
}: CalEmbedProps) {
  const { language } = useLanguage();

  useEffect(() => {
    (async () => {
      const cal = await getCalApi({ namespace: "scoping-call" });
      cal("ui", {
        theme,
        hideEventTypeDetails,
        cssVarsPerTheme: {
          dark: {
            "cal-brand": "#c7a87a",
            "cal-bg": "#0e1015",
            "cal-bg-emphasis": "#161922",
            "cal-text": "#efe7d8",
            "cal-text-emphasis": "#ffffff",
            "cal-text-muted": "#9a958b",
            "cal-border": "#2a2c33",
            "cal-border-emphasis": "#c7a87a",
          },
          light: {
            "cal-brand": "#9a7b48",
          },
        },
      });
    })();
  }, [theme, hideEventTypeDetails]);

  return (
    <div className="cal-embed-wrap relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-2 -top-2 -bottom-2 rounded-2xl"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, hsl(var(--accent-warm) / 0.06), transparent 70%)",
        }}
      />
      <div className="relative rounded-xl border border-rule-warm/40 bg-surface-elev/80 backdrop-blur-sm p-2 sm:p-3 overflow-hidden">
        <Cal
          namespace="scoping-call"
          calLink={slug}
          style={{ width: "100%", height: "640px", overflow: "scroll" }}
          config={{
            layout: "month_view",
            theme,
            "cal.language": language === "it" ? "it" : "en",
          }}
        />
      </div>
    </div>
  );
}
