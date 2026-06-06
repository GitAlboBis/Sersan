"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Global error boundary — caught by App Router whenever a server or
 * client component throws. Keeps the layout chrome alive via the
 * mounted parent layout. Mirrors the editorial tone of not-found.tsx.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Send to whatever observability you wire up later. For now, just
    // surface it in the dev console so you can see the digest.
    console.error("[Sersan error boundary]", error);
  }, [error]);

  return (
    <div className="container-px relative flex min-h-[70vh] flex-col items-start justify-center py-24">
      <p className="eyebrow mb-6 inline-flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{
            background: "hsl(var(--refusal))",
            boxShadow: "0 0 12px hsl(var(--refusal) / 0.5)",
          }}
        />
        Something broke
      </p>

      <h1 className="heading-1 mb-6 max-w-[20ch]">
        Even our systems wake up at 3am{" "}
        <span className="font-display font-medium" style={{ color: "hsl(var(--accent))" }}>
          sometimes.
        </span>
      </h1>

      <p className="mb-10 max-w-[40rem] text-lg leading-[1.55] text-ink-mute">
        An unexpected error reached the surface. The path that caused it has been
        logged. You can retry the page, or head somewhere else and we&apos;ll
        investigate from our end.
      </p>

      {error.digest && (
        <p className="mb-8 text-[11px] font-mono uppercase tracking-[0.14em] text-ink-mute/70">
          Digest · {error.digest}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="hero" size="lg" onClick={() => reset()}>
          Try again
        </Button>
        <Link href="/">
          <Button variant="heroOutline" size="lg">
            Back to home
          </Button>
        </Link>
      </div>
    </div>
  );
}
