/**
 * Conversion instrumentation — PROMPT 17.
 *
 * WHAT THIS IS
 * ------------
 * A thin, typed wrapper over Vercel Web Analytics' `track()`. It exists so that
 * event names and property shapes are declared in ONE place and cannot drift
 * between the twenty-odd call sites that fire them.
 *
 * PRIVACY POSTURE (this is load-bearing, not boilerplate)
 * ------------------------------------------------------
 * Vercel Web Analytics is COOKIELESS. It sets no cookie, stores no identifier
 * in the browser, and does not track visitors across sites. That is why this
 * instrumentation ships without a consent banner and why /cookies describes
 * analytics the way it now does — the previous copy declared a consent-gated
 * analytics category that the code never actually gated, which was a live gap
 * between the policy and the product.
 *
 * The rules that keep it that way:
 *   1. NEVER pass free-text the visitor typed. Not the project brief, not the
 *      company name, not an email, not a phone number, not a link they pasted.
 *      Only enumerated values the code itself chose (a budget BAND, not a
 *      number; a service SLUG, not a description).
 *   2. NEVER pass anything that could single a person out.
 *   3. Every property value must be a string/number/boolean — the transport
 *      rejects objects and arrays.
 * If you are about to add a property and cannot tell which side of rule 1 it
 * falls on, it falls on the wrong side.
 *
 * FIRING DISCIPLINE
 * -----------------
 * Events fire ONCE per user intent. `trackOnce` is provided for view-type
 * events that would otherwise re-fire on every re-render, scroll tick or
 * StrictMode double-invoke.
 */

import { track as vercelTrack } from "@vercel/analytics";

/* ------------------------------------------------------------------ *
 * Event names — normalized, snake_case, verb-last.
 * Adding one here is the only way to fire one.
 * ------------------------------------------------------------------ */

export const EVENTS = {
  /** Primary "Send a project brief" CTA, anywhere on the site. */
  CTA_PROJECT_BRIEF: "cta_project_brief",
  /** Secondary "See our work" CTA. */
  CTA_SELECTED_WORK: "cta_selected_work",
  /** A service page's own conversion CTA. Carries `service`. */
  SERVICE_CTA_CLICKED: "service_cta_clicked",
  /** A case-study page's conversion CTA. Carries `case_study`. */
  CASE_STUDY_CTA_CLICKED: "case_study_cta_clicked",
  /** The /audit page's conversion CTA. */
  CTA_AUDIT: "cta_audit",
  /** A mailto: link. */
  CTA_EMAIL: "cta_email",
  /** A tel: or WhatsApp link. */
  CTA_PHONE: "cta_phone",

  /** The intake form scrolled into view. Fires once per page view. */
  LEAD_FORM_VIEWED: "lead_form_viewed",
  /** First interaction with any intake field. Fires once per page view. */
  LEAD_FORM_STARTED: "lead_form_started",
  /** A budget band was selected. Carries the BAND, never a number. */
  LEAD_FORM_BUDGET_SELECTED: "lead_form_budget_selected",
  /** Client-side validation blocked a submit. Carries which fields, by name. */
  LEAD_FORM_ERROR: "lead_form_error",
  /** The server accepted the submission. The conversion. */
  LEAD_FORM_SUBMITTED: "lead_form_submitted",

  /** Homepage scroll depth milestones. Each fires at most once. */
  SCROLL_DEPTH: "scroll_depth",
  /** A service page was read to the end. */
  SERVICE_COMPLETED: "service_completed",
  /** A case study was read to the end. */
  CASE_STUDY_COMPLETED: "case_study_completed",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

/**
 * Properties every event may carry.
 *
 * `source_section` is the single most useful one: it tells us WHICH of the many
 * "send a brief" buttons converted, which is otherwise unknowable because they
 * all point at the same route.
 */
export interface EventProps {
  /** Route the event fired on, e.g. "/services/automation". */
  page?: string;
  /** Named region of the page, e.g. "hero", "final_cta", "nav", "footer". */
  source_section?: string;
  /** Service slug, for service-scoped events. */
  service?: string;
  /** Case-study id, for case-study-scoped events. */
  case_study?: string;
  /** Enumerated budget band value — NEVER a typed amount. */
  budget_band?: string;
  /** Which form: "start" | "consulting" | "contact". */
  form?: string;
  /** Comma-joined field NAMES that failed validation. Never field values. */
  fields?: string;
  /** Scroll milestone: 25 | 50 | 75 | 100. */
  depth?: number;
  /** Interface language at the time of the event. */
  lang?: string;
}

/* ------------------------------------------------------------------ *
 * UTM capture — read from the URL, never from storage, never joined to
 * anything that identifies a person.
 * ------------------------------------------------------------------ */

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign"] as const;

function utmProps(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const out: Record<string, string> = {};
  try {
    const q = new URLSearchParams(window.location.search);
    for (const k of UTM_KEYS) {
      const v = q.get(k);
      // Cap the length: a UTM value is a campaign slug, and an over-long one is
      // either a bug or someone stuffing the querystring.
      if (v) out[k] = v.slice(0, 64);
    }
  } catch {
    /* a malformed querystring must never break a CTA */
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * The API
 * ------------------------------------------------------------------ */

/**
 * Fire an event. Safe to call from anywhere: it is a no-op during SSR, and it
 * never throws — an analytics failure must not take a conversion with it.
 */
export function track(name: EventName, props: EventProps = {}): void {
  if (typeof window === "undefined") return;
  try {
    const payload: Record<string, string | number | boolean> = {
      page: props.page ?? window.location.pathname,
      ...utmProps(),
    };
    for (const [k, v] of Object.entries(props)) {
      if (k === "page") continue;
      if (v === undefined || v === null || v === "") continue;
      payload[k] = v as string | number | boolean;
    }
    vercelTrack(name, payload);
  } catch {
    /* never let instrumentation break the page */
  }
}

/**
 * Fire an event at most once per page load, keyed by name + an optional
 * discriminator. Use for view/started/depth events that sit in effects,
 * scroll handlers or focus handlers and would otherwise fire repeatedly.
 */
const fired = new Set<string>();

export function trackOnce(name: EventName, props: EventProps = {}, key?: string): void {
  const k = key ? `${name}:${key}` : name;
  if (fired.has(k)) return;
  fired.add(k);
  track(name, props);
}

/** Reset the once-guard. Call on client-side route change. */
export function resetTrackOnce(): void {
  fired.clear();
}

/**
 * Attach homepage scroll-depth milestones. Returns a cleanup function.
 *
 * Passive listener, rAF-throttled, and it detaches itself once 100% is reached
 * so a long session does not keep a handler on the scroll path of a page that
 * is already running a WebGL loop and several pinned ScrollTriggers.
 */
export function trackScrollDepth(page: string): () => void {
  if (typeof window === "undefined") return () => {};

  const milestones = [25, 50, 75, 100];
  let ticking = false;
  let done = false;

  const measure = () => {
    ticking = false;
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - window.innerHeight;
    if (scrollable <= 0) return;
    const pct = Math.min(100, Math.round((window.scrollY / scrollable) * 100));
    for (const m of milestones) {
      if (pct >= m) trackOnce(EVENTS.SCROLL_DEPTH, { page, depth: m }, `${page}:${m}`);
    }
    if (pct >= 100 && !done) {
      done = true;
      detach();
    }
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(measure);
  };

  const detach = () => window.removeEventListener("scroll", onScroll);

  window.addEventListener("scroll", onScroll, { passive: true });
  return detach;
}
