"use client";

/**
 * CommandPalette — ⌘K / Ctrl+K quick navigation, in the site's mono grammar.
 *
 * One Radix Dialog (focus trap, portal, Esc, aria) holding a filter input and
 * a keyboard-driven list: every route plus three actions (book a call, switch
 * language, copy the studio email). Substring filter over label + keywords in
 * BOTH languages, ArrowUp/Down + Enter, pointer hover moves the selection.
 * Fires from anywhere except editable fields; closes itself before routing so
 * the route-transition cover owns the screen.
 *
 * Deliberately DOM-only and dependency-free beyond Radix (already shipped for
 * dialogs): no cmdk — the item set is a dozen rows, a substring scan per
 * keystroke is nothing, and the visual identity (hairlines, JetBrains mono
 * eyebrows, the accent dot idiom) comes from the site, not a library theme.
 * Reduced motion: the entrance transitions collapse via motion-reduce.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { useLanguage } from "@/components/language-provider";
import { CONTACT_EMAIL, START_HREF } from "@/lib/site";
import { cn } from "@/lib/utils";

interface PaletteItem {
  id: string;
  /** Mono group eyebrow the row sits under. */
  group: "navigate" | "actions";
  label: string;
  labelIt: string;
  /** Extra match terms (both languages, lowercase). */
  keywords: string;
  /** Route target (navigate rows) — actions leave it undefined. */
  href?: string;
  /** Right-edge mono annotation (route path / action hint). */
  hint: string;
}

const ITEMS: PaletteItem[] = [
  { id: "home", group: "navigate", label: "Home", labelIt: "Home", keywords: "start hero intro", href: "/", hint: "/" },
  { id: "audit", group: "navigate", label: "Technical audit", labelIt: "Audit tecnico", keywords: "audit surfaces week report", href: "/audit", hint: "/audit" },
  { id: "consulting", group: "navigate", label: "Consulting", labelIt: "Consulenza", keywords: "services engage sprint cto practice", href: "/consulting", hint: "/consulting" },
  { id: "work", group: "navigate", label: "Selected work", labelIt: "Lavori selezionati", keywords: "case studies archive engagements portfolio", href: "/case-studies", hint: "/case-studies" },
  { id: "writing", group: "navigate", label: "Writing", labelIt: "Scritti", keywords: "resources articles guides field notes blog", href: "/resources", hint: "/resources" },
  { id: "about", group: "navigate", label: "Team", labelIt: "Team", keywords: "about founders alessandro michele mattia chi siamo", href: "/about", hint: "/about" },
  { id: "trust", group: "navigate", label: "Trust & compliance", labelIt: "Trust e compliance", keywords: "security gdpr dora iso privacy sicurezza", href: "/trust", hint: "/trust" },
  { id: "contact", group: "navigate", label: "Contact", labelIt: "Contatti", keywords: "email phone reach talk contatto", href: "/contact", hint: "/contact" },
  { id: "book", group: "actions", label: "Book a scoping call", labelIt: "Prenota una scoping call", keywords: "call meeting start brief prenota chiamata", href: START_HREF, hint: "↵" },
  { id: "lang", group: "actions", label: "Switch to Italiano", labelIt: "Passa all'inglese", keywords: "language lingua english italiano en it", hint: "EN⇄IT" },
  { id: "email", group: "actions", label: "Copy email address", labelIt: "Copia l'indirizzo email", keywords: "mail clipboard copia scrivi", hint: "⧉" },
];

const GROUP_LABEL: Record<PaletteItem["group"], { en: string; it: string }> = {
  navigate: { en: "Navigate", it: "Naviga" },
  actions: { en: "Actions", it: "Azioni" },
};

/** True when the key event originates in an editable field — the palette
 * shortcut must never steal ⌘K from an input the visitor is typing into. */
const inEditable = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  return (
    tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable
  );
};

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const { language, setLanguage } = useLanguage();
  const isEn = language === "en";

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Global shortcut. keydown at the document level, checked before any other
  // consumer; the browser's own ⌘K (address-bar focus on some platforms) is
  // suppressed only while the site owns the gesture.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        if (inEditable(e)) return;
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Fresh sheet on every open; `copied` is per-open feedback.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setCopied(false);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = ITEMS.filter((it) => it.href !== pathname || it.group === "actions");
    if (!q) return pool;
    return pool.filter((it) =>
      (it.label + " " + it.labelIt + " " + it.keywords + " " + (it.href ?? ""))
        .toLowerCase()
        .includes(q),
    );
  }, [query, pathname]);

  const run = useCallback(
    (item: PaletteItem) => {
      if (item.id === "lang") {
        setLanguage(isEn ? "it" : "en");
        setOpen(false);
        return;
      }
      if (item.id === "email") {
        void navigator.clipboard?.writeText(CONTACT_EMAIL).then(() => {
          setCopied(true);
          window.setTimeout(() => setOpen(false), 650);
        });
        return;
      }
      if (item.href) {
        setOpen(false);
        router.push(item.href);
      }
    },
    [isEn, router, setLanguage],
  );

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!filtered.length) return;
      const next =
        e.key === "ArrowDown"
          ? (active + 1) % filtered.length
          : (active - 1 + filtered.length) % filtered.length;
      setActive(next);
      listRef.current
        ?.querySelector(`[data-cp-index="${next}"]`)
        ?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[active];
      if (item) run(item);
    }
  };

  // Group rows for rendering while preserving the flat index the keyboard
  // navigation moves over.
  let flatIndex = -1;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-[80] bg-[#050B14]/70 backdrop-blur-[2px]",
            "animate-[cp-fade_150ms_ease-out] motion-reduce:animate-none",
          )}
        />
        <Dialog.Content
          aria-describedby={undefined}
          onKeyDown={onListKey}
          className={cn(
            "fixed z-[81] left-1/2 top-[18vh] w-[min(34rem,92vw)] -translate-x-1/2",
            "rounded-xl border border-rule/80 bg-[#0B1422]/95 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.8)]",
            "backdrop-blur-md overflow-hidden",
            "animate-[cp-pop_180ms_cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none",
          )}
        >
          <Dialog.Title className="sr-only">
            {isEn ? "Quick navigation" : "Navigazione rapida"}
          </Dialog.Title>

          <div className="flex items-center gap-3 border-b border-rule/60 px-4">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]"
            />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              placeholder={isEn ? "Where to?" : "Dove andiamo?"}
              className="h-12 w-full bg-transparent font-sans text-[15px] text-ink placeholder:text-ink-mute/70 outline-none"
            />
            <kbd className="shrink-0 rounded border border-rule/70 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-mute">
              esc
            </kbd>
          </div>

          <div ref={listRef} className="max-h-[46vh] overflow-y-auto py-2">
            {(["navigate", "actions"] as const).map((group) => {
              const rows = filtered.filter((it) => it.group === group);
              if (!rows.length) return null;
              return (
                <div key={group} className="px-2 pb-1">
                  <p className="px-2 pb-1.5 pt-2 font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-mute/80">
                    {GROUP_LABEL[group][isEn ? "en" : "it"]}
                  </p>
                  {rows.map((item) => {
                    flatIndex++;
                    const idx = flatIndex;
                    const isActive = idx === active;
                    const label =
                      item.id === "email" && copied
                        ? isEn
                          ? "Copied"
                          : "Copiato"
                        : isEn
                          ? item.label
                          : item.labelIt;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-cp-index={idx}
                        data-cursor="link"
                        onPointerEnter={() => setActive(idx)}
                        onClick={() => run(item)}
                        className={cn(
                          "flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2.5 text-left",
                          "transition-colors duration-100",
                          isActive
                            ? "bg-[hsl(var(--accent)/0.08)] text-ink"
                            : "text-ink-mute",
                        )}
                      >
                        <span className="flex items-center gap-2.5 text-[14px]">
                          <span
                            aria-hidden="true"
                            className={cn(
                              "h-1 w-1 rounded-full transition-colors duration-100",
                              isActive ? "bg-[hsl(var(--accent))]" : "bg-rule",
                            )}
                          />
                          {label}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-mute/70">
                          {item.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="px-5 py-6 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute">
                {isEn ? "No match — Esc to close" : "Nessun risultato — Esc per chiudere"}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-rule/60 px-4 py-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-mute/70">
            <span>{isEn ? "↑↓ move · ↵ go" : "↑↓ muovi · ↵ vai"}</span>
            <span>SERSAN</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
