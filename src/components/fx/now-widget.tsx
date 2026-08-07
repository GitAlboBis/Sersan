"use client";

/**
 * NowWidget — the footer's live "NOW · ON-CALL · ALESSANDRO · LDN · [time]"
 * strip from the site spec (AGENTS.md footer block), previously never built.
 *
 * London time via Intl with an explicit timeZone (the studio clock, not the
 * visitor's), re-rendered once a minute. Hydration-safe: the server renders
 * an em-dash placeholder and the first client effect fills the real time —
 * `suppressHydrationWarning` covers the one text node that legitimately
 * differs. The dot reuses the footer's status-dot idiom (accent + pulse).
 */
import { useEffect, useState } from "react";

const LONDON_TIME = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Europe/London",
});

export function NowWidget() {
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
        {"Now · On-call · Alessandro · LDN · "}
        {time ?? "—:—"}
      </span>
    </span>
  );
}
