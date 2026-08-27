"use client";

/**
 * NowWidget — the footer's live London clock strip.
 *
 * It used to read "NOW · ON-CALL · ALESSANDRO · LDN · [time]", a leftover of
 * the retired "if it breaks at 3am we're the ones who wake up" positioning
 * (STRATEGY §7 rules that voice off-charter). Naming one person as on-call at
 * whatever hour the visitor happens to load the page promises round-the-clock
 * personal availability that nothing else on the site backs — the actual
 * promise is FACTS.replyTime, one row above this in the footer. The clock
 * itself stays: it is a true, quiet signal of where the studio sits, and the
 * footer layout expects the row.
 *
 * London time via Intl with an explicit timeZone (the studio clock, not the
 * visitor's), re-rendered once a minute. Hydration-safe: the server renders
 * an em-dash placeholder and the first client effect fills the real time —
 * `suppressHydrationWarning` covers the one text node that legitimately
 * differs. The dot reuses the footer's status-dot idiom (accent + pulse).
 */
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/language-provider";

const LONDON_TIME = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Europe/London",
});

export function NowWidget() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setTime(LONDON_TIME.format(new Date()));
    update();
    // Tick on the next minute boundary, then every minute — the readout is
    // HH:MM, so a fixed 60s interval could lag a displayed minute by up to
    // one whole minute after a background-tab throttle.
    let intervalId = 0;
    const align = window.setTimeout(() => {
      update();
      intervalId = window.setInterval(update, 60_000);
    }, (60 - new Date().getSeconds()) * 1000);
    return () => {
      window.clearTimeout(align);
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.12em] uppercase text-ink-mute">
      <span aria-hidden="true" className="status-dot" />
      <span suppressHydrationWarning>
        {isEn ? "Now · London · " : "Ora · Londra · "}
        {time ?? "—:—"}
      </span>
    </span>
  );
}
