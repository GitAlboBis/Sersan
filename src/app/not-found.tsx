"use client";

import Link from "next/link";
import { Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-provider";

export default function NotFound() {
  const { language } = useLanguage();
  const isEn = language === "en";

  const suggestedLinks = [
    { href: "/", label: isEn ? "Home" : "Home", icon: Home },
    { href: "/audit", label: isEn ? "Audit" : "Audit", icon: Search },
    { href: "/consulting", label: isEn ? "Consulting" : "Consulenza", icon: Search },
    { href: "/case-studies", label: isEn ? "Work" : "Lavori", icon: Search },
    { href: "/about", label: isEn ? "About" : "Chi siamo", icon: Search },
    { href: "/resources", label: isEn ? "Writing" : "Articoli", icon: Search },
    { href: "/contact", label: isEn ? "Contact" : "Contatti", icon: Search },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <main className="flex-1 flex items-center justify-center section relative">
        <div className="container-px">
          <div className="max-w-2xl mx-auto text-center">
            <p className="eyebrow mb-6 flex items-center justify-center gap-2">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full bg-[hsl(var(--accent))]"
                aria-hidden="true"
              />
              {isEn
                ? "404 · Off the production path"
                : "404 · Fuori dal percorso di produzione"}
            </p>

            <h1 className="font-display text-[clamp(2rem,6.5vw,4.25rem)] leading-[1.1] tracking-[-0.025em] text-ink text-balance mb-8 pb-1">
              {isEn ? (
                <>
                  This route never reached{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    production.
                  </span>
                </>
              ) : (
                <>
                  Questa rotta non è mai arrivata in{" "}
                  <span className="italic" style={{ color: "hsl(var(--accent))" }}>
                    produzione.
                  </span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground mb-10 leading-[1.55] text-balance max-w-lg mx-auto">
              {isEn
                ? "Either the link is stale, the page moved, or it never shipped at all. Pick a destination below — these are live."
                : "Il link è obsoleto, la pagina è stata spostata, oppure non è mai stata pubblicata. Scegliete una destinazione qui sotto — queste sono attive."}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-14">
              <Button
                asChild
                variant="hero"
                size="lg"
                className="w-full sm:w-auto px-8 py-6 rounded-full font-semibold"
              >
                <Link href="/">
                  <Home className="w-4 h-4 mr-2" />
                  {isEn ? "Back to home" : "Torna alla home"}
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto px-8 py-6 rounded-full font-semibold"
              >
                <Link href="/contact">
                  {isEn ? "Contact us" : "Contattaci"}
                </Link>
              </Button>
            </div>

            <div className="pt-8 border-t border-rule/50">
              <p className="eyebrow mb-5">{isEn ? "Or explore" : "O esplora"}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestedLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border/60 bg-background/40 backdrop-blur-sm text-xs font-medium text-muted-foreground hover:text-foreground hover:border-rule/70 transition-colors"
                  >
                    <link.icon className="w-3 h-3" aria-hidden="true" />
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
