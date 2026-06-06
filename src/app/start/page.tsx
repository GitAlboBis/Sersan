import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { founders } from "@/data/founders";
import StartIntakeForm from "@/components/start-intake-form";

export const metadata: Metadata = {
  title: "Start with a technical scoping call",
  description:
    "Tell us what you're trying to build, automate, or harden. We'll review the context and reply within one business day with a recommended next step.",
  alternates: { canonical: "/start" },
  robots: { index: true, follow: true },
};

/**
 * /start — the technical intake page.
 *
 * Replaces the old `mailto:` primary CTA across the site. The page itself
 * is a server component (so metadata + initial paint are crisp). The form
 * is a client component (StartIntakeForm) because it owns the multi-field
 * controlled state + submit-state machine.
 */
export default function StartPage() {
  return (
    <div className="relative min-h-[100svh]">
      <main className="container-px pt-32 pb-24 sm:pt-40 sm:pb-32">
        <div className="max-w-5xl mx-auto">
          <header className="mb-12 sm:mb-16 max-w-2xl">
            <p className="eyebrow inline-flex items-center gap-2 text-ink-mute mb-6">
              <span aria-hidden="true" className="status-dot" />
              <span>Technical scoping call</span>
            </p>
            <h1 className="font-display text-[clamp(2.5rem,5.5vw,4.5rem)] leading-[0.98] tracking-[-0.03em] text-ink mb-6">
              Start with a{" "}
              <span className="text-[hsl(var(--accent))] font-display font-medium">
                technical scoping call.
              </span>
            </h1>
            <p className="text-base sm:text-lg text-ink-mute leading-[1.55] max-w-xl">
              Tell us what you&apos;re trying to build, automate, or harden.
              We&apos;ll review the context and reply within one business day
              with a recommended next step — sometimes that&apos;s a build,
              sometimes an audit, sometimes &ldquo;don&apos;t do this.&rdquo;
            </p>
          </header>

          {/* What happens next — sets expectations before they fill anything */}
          <div className="mb-16 sm:mb-20 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 max-w-4xl">
            {[
              {
                num: "01",
                title: "You send a brief",
                body: "Two or three sentences is enough. Drop a Loom, a repo link, or a doc if it helps.",
              },
              {
                num: "02",
                title: "We reply within 1 business day",
                body: "Read by one of the founders, not a queue. We confirm if we're a fit before scheduling.",
              },
              {
                num: "03",
                title: "30-minute call",
                body: "Senior engineering, technical depth. You leave with a written next-step recommendation.",
              },
            ].map((step) => (
              <article
                key={step.num}
                className="p-5 rounded-lg border border-[hsl(var(--rule))] bg-[hsl(var(--surface)/0.4)]"
              >
                <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-mute/80">
                  {step.num}
                </span>
                <h3 className="mt-2 font-display text-lg leading-tight text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-[13px] text-ink-mute leading-relaxed">
                  {step.body}
                </p>
              </article>
            ))}
          </div>

          {/* Form */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
            <div className="lg:col-span-7">
              <h2 className="font-display text-2xl sm:text-3xl leading-[1.05] tracking-[-0.022em] text-ink mb-2">
                Send a brief
              </h2>
              <p className="text-[13.5px] text-ink-mute mb-8 leading-relaxed">
                No marketing follow-ups. No demo decks. Read by one of the
                founders. Required fields marked.
              </p>
              <StartIntakeForm />
            </div>

            <aside className="lg:col-span-5">
              <div className="lg:sticky lg:top-32">
                <h2 className="font-mono text-[11px] tracking-[0.18em] uppercase text-ink-mute mb-5">
                  Who reads this
                </h2>

                {/* Founder block — the brief literally lands with one of these
                    two people. Pulled live from src/data/founders.ts so the
                    photos / roles / LinkedIn URLs stay in sync with /about. */}
                <ul className="flex flex-col gap-4 mb-6 list-none">
                  {founders.map((f) => (
                    <li key={f.anchor} className="flex items-center gap-3.5">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden border border-[hsl(var(--rule))] bg-[hsl(var(--surface))] shrink-0">
                        <Image
                          src={f.image}
                          alt={`${f.name}, ${f.roleEn}`}
                          fill
                          sizes="48px"
                          className="object-cover object-center"
                        />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={f.linkedIn}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block font-display text-[15px] leading-tight text-ink hover:text-[hsl(var(--accent))] transition-colors"
                        >
                          {f.name}
                        </Link>
                        <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-mute truncate">
                          {f.roleEn}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>

                <p className="text-[14px] text-ink-mute leading-relaxed mb-6">
                  Your brief lands directly in our inbox. No account managers,
                  no sales engineers, no AI BDR sequences. If we&apos;re a
                  fit, we&apos;ll book a call. If we&apos;re not, we&apos;ll
                  tell you — usually with a pointer to who is.
                </p>

                <h2 className="font-mono text-[11px] tracking-[0.18em] uppercase text-ink-mute mb-3 mt-10">
                  Not ready to scope?
                </h2>
                <ul className="flex flex-col gap-2 text-[13.5px] text-ink-mute">
                  <li>
                    <a
                      href="/#process"
                      className="text-ink hover:text-[hsl(var(--accent))] transition-colors underline underline-offset-4 decoration-[hsl(var(--ink-mute)/0.3)] hover:decoration-[hsl(var(--accent))]"
                    >
                      How we work →
                    </a>
                  </li>
                  <li>
                    <a
                      href="/#work"
                      className="text-ink hover:text-[hsl(var(--accent))] transition-colors underline underline-offset-4 decoration-[hsl(var(--ink-mute)/0.3)] hover:decoration-[hsl(var(--accent))]"
                    >
                      Selected work →
                    </a>
                  </li>
                  <li>
                    <a
                      href="/#trust"
                      className="text-ink hover:text-[hsl(var(--accent))] transition-colors underline underline-offset-4 decoration-[hsl(var(--ink-mute)/0.3)] hover:decoration-[hsl(var(--accent))]"
                    >
                      What &ldquo;production-grade&rdquo; means →
                    </a>
                  </li>
                  <li>
                    <a
                      href="mailto:alex.s@sersan.dev"
                      className="text-ink hover:text-[hsl(var(--accent))] transition-colors underline underline-offset-4 decoration-[hsl(var(--ink-mute)/0.3)] hover:decoration-[hsl(var(--accent))]"
                    >
                      Or just email us →
                    </a>
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
