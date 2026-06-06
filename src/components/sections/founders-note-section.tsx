import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { founders } from "@/data/founders";

/**
 * FoundersNoteSection — gives the two humans real estate of their own.
 *
 * Engineering buyers buy from engineers. The homepage should make at least
 * one founder feel like a real person — credentials, background, and the
 * commitment that *they* are who you talk to.
 */
export default function FoundersNoteSection() {
  return (
    <section
      id="founders"
      className="relative section-lg scroll-mt-24"
    >
      <div className="container-px">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          <div className="lg:col-span-5">
            <SectionHeading
              eyebrow="Built by two engineers"
              title={
                <>
                  You talk to one of us.
                  <br className="hidden sm:block" />
                  <span className="text-ink-mute">
                    {" "}
                    Not a sales engineer. Not an account lead.
                  </span>
                </>
              }
              description="SerSan is two founders. That's a deliberate ceiling — small enough to keep the work in our hands, senior enough to take it past the prototype."
            />
            <p className="mt-8 text-[14px] text-ink-mute leading-relaxed max-w-md">
              We started SerSan because the AI consulting market is full of decks
              and short on systems. If we agree on a build, the same two people
              who scoped it are the ones writing the code and on the pager when
              it ships.
            </p>
          </div>

          <div className="lg:col-span-7 flex flex-col gap-5">
            {founders.map((f, i) => (
              <Reveal key={f.name} delay={i * 110}>
                <article className="flex flex-col sm:flex-row gap-5 sm:gap-7 p-6 sm:p-7 rounded-2xl border border-[hsl(var(--rule)/0.7)] bg-[hsl(var(--surface)/0.5)]">
                  <div className="shrink-0">
                    <Image
                      src={f.image}
                      alt={f.name}
                      width={88}
                      height={88}
                      className="w-[72px] h-[72px] sm:w-[88px] sm:h-[88px] rounded-full object-cover object-[50%_20%] ring-1 ring-rule"
                    />
                  </div>
                  <div className="flex flex-col gap-3 flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h3 className="font-display text-[1.3rem] sm:text-[1.45rem] text-ink leading-tight">
                        {f.name}
                      </h3>
                      <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-ink-mute">
                        {f.roleEn}
                      </span>
                    </div>

                    <p className="text-[14px] text-ink-mute leading-relaxed">
                      {f.shortBioEn}
                    </p>

                    {f.previouslyAt ? (
                      <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-ink-mute/80">
                        Previously at:{" "}
                        <span className="text-ink/85">
                          {f.previouslyAt.join(" · ")}
                        </span>
                      </div>
                    ) : null}

                    {f.credentialsEn?.length ? (
                      <ul className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] font-mono uppercase tracking-[0.12em] text-ink-mute">
                        {f.credentialsEn.map((c) => (
                          <li
                            key={c}
                            className="flex items-center gap-2 before:content-[''] before:w-1 before:h-1 before:rounded-full before:bg-ink-mute/60"
                          >
                            {c}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <div className="flex items-center gap-4 mt-1">
                      <Link
                        href={f.linkedIn}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-1.5 text-[12px] font-mono uppercase tracking-[0.14em] text-ink-mute hover:text-ink transition-colors"
                      >
                        LinkedIn
                        <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </Link>
                      <Link
                        href={`/about#${f.anchor}`}
                        className="group inline-flex items-center gap-1.5 text-[12px] font-mono uppercase tracking-[0.14em] text-ink-mute hover:text-ink transition-colors"
                      >
                        Full bio
                        <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </Link>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
