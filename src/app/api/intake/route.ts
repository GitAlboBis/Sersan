import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * POST /api/intake
 *
 * Receives the /start page intake payload. Validates with zod. If
 * RESEND_API_KEY is configured in env, forwards a notification email
 * to ops; otherwise stays a dev stub that logs the payload server-side
 * and returns success so the form's UX completes.
 *
 * The schema below is the SOURCE OF TRUTH for the form contract.
 * Keep it in sync with `src/app/start/page.tsx`.
 *
 * Schema shape was rebuilt as part of the v2 rebuild (see
 * docs/STRATEGY.md §B3). This route serves TWO live forms: the /start
 * page intake AND the multi-step intake mounted on /consulting
 * (multi-step-intake.tsx), which maps its own fields onto this schema
 * before POSTing here.
 */

const IntakeSchema = z.object({
  // Optional self-locator: the seven business problems a visitor can
  // recognise themselves in, rendered as the intake's first question.
  situation: z
    .enum([
      "manual-process",
      "tools-not-talking",
      "software-to-build",
      "product-idea",
      "system-struggling",
      "ai-worth-it",
      "none",
    ])
    .optional(),
  name: z.string().min(1).max(120),
  email: z.string().email(),
  company: z.string().min(1).max(120),
  // Only name / email / company / objective are required. Everything below
  // is context we are glad to get and will never block a brief on.
  role: z.string().max(120).optional().default(""),
  objective: z.string().min(8, "Please describe what you're trying to build."),
  stage: z
    .enum([
      "manual-today",
      "idea",
      "prototype",
      "in-use",
      "needs-fixing",
    ])
    .optional(),
  timeline: z
    .enum(["asap", "this-month", "this-quarter", "exploring"])
    .optional(),
  budget: z
    .enum(["under-5k", "5-10k", "10-25k", "25-50k", "50k-plus", "not-sure"])
    .optional(),
  stack: z.string().max(500).optional().default(""),
  compliance: z.string().max(500).optional().default(""),
  links: z.string().max(1000).optional().default(""),
  language: z.enum(["en", "it"]).optional(),
});

export type IntakePayload = z.infer<typeof IntakeSchema>;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const parsed = IntakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Validation failed", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const data = parsed.data;

  // Resend integration — env-gated. If RESEND_API_KEY isn't set, we
  // simply log to the server console (dev mode).
  const resendKey = process.env.RESEND_API_KEY;
  const opsEmail = process.env.OPS_EMAIL ?? "alex.s@sersan.dev";

  if (resendKey) {
    try {
      const html = renderIntakeEmail(data);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Sersan Intake <ops@sersan.io>",
          to: [opsEmail],
          reply_to: data.email,
          subject: `New brief — ${data.name} · ${data.company}${data.stage ? ` (${data.stage})` : ""}`,
          html,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("[intake] Resend rejected:", res.status, text);
        // Don't fail the visitor — but the claim "we can recover the lead"
        // is only true if the lead is actually IN the log. Print it.
        console.error("[intake] UNDELIVERED LEAD — recover manually:", JSON.stringify(data));
      }
    } catch (e) {
      console.error("[intake] Email forward failed:", e);
      console.error("[intake] UNDELIVERED LEAD — recover manually:", JSON.stringify(data));
    }
  } else if (process.env.NODE_ENV === "production") {
    // A production deploy with no RESEND_API_KEY silently swallowed every
    // brief on the site's only working conversion path, while still returning
    // ok:true to the visitor. Make it loud, and keep the payload so the lead
    // survives in the log until the key is set.
    console.error(
      "[intake] MISCONFIGURED — RESEND_API_KEY is not set in production. " +
        "Briefs are being accepted and NOT delivered.",
    );
    console.error("[intake] UNDELIVERED LEAD — recover manually:", JSON.stringify(data));
  } else {
    // Dev fallback — surface in the server log so we can verify shape.
    console.log("[intake] (dev — no RESEND_API_KEY set) payload:", data);
  }

  return NextResponse.json({ ok: true });
}

// ----- internal helpers -----

const SITUATION_LABEL: Record<
  NonNullable<IntakePayload["situation"]>,
  string
> = {
  "manual-process": "A manual process is eating the team's time",
  "tools-not-talking": "Tools don't talk to each other",
  "software-to-build": "Needs internal software that doesn't exist yet",
  "product-idea": "Has a product idea and needs it built",
  "system-struggling": "Existing system is slow, fragile or breaking",
  "ai-worth-it": "Wants to know whether AI is worth it here",
  none: "None of these quite fit",
};

const STAGE_LABEL: Record<NonNullable<IntakePayload["stage"]>, string> = {
  "manual-today": "Manual today",
  idea: "Idea",
  prototype: "Early version exists",
  "in-use": "Live system in use",
  "needs-fixing": "Existing system needs fixing",
};
const TIMELINE_LABEL: Record<NonNullable<IntakePayload["timeline"]>, string> = {
  asap: "ASAP",
  "this-month": "This month",
  "this-quarter": "This quarter",
  exploring: "Exploring",
};
const BUDGET_LABEL: Record<NonNullable<IntakePayload["budget"]>, string> = {
  "under-5k": "£2.5k–£5k",
  "5-10k": "£5k–£10k",
  "10-25k": "£10k–£25k",
  "25-50k": "£25k–£50k",
  "50k-plus": "£50k+",
  "not-sure": "Not sure yet",
};

function renderIntakeEmail(d: IntakePayload): string {
  const row = (k: string, v: string) =>
    v
      ? `<tr><td style="padding:6px 14px 6px 0;color:#9aa3ad;font-family:JetBrains Mono,monospace;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;vertical-align:top;white-space:nowrap;">${k}</td><td style="padding:6px 0;color:#f3f1ec;font-family:-apple-system,Segoe UI,sans-serif;font-size:14px;line-height:1.55;">${escape(v)}</td></tr>`
      : "";
  return `
    <div style="background:#0e1424;padding:32px;color:#f3f1ec;font-family:-apple-system,Segoe UI,sans-serif;">
      <h2 style="font-family:Georgia,serif;font-weight:400;font-size:24px;margin:0 0 8px;">New brief from ${escape(d.name)}.</h2>
      <p style="margin:0 0 24px;color:#9aa3ad;font-size:13px;">${escape(d.company)}${d.role ? ` · ${escape(d.role)}` : ""}</p>
      <table style="border-collapse:collapse;width:100%;">
        ${row("Email", d.email)}
        ${row("Situation", d.situation ? SITUATION_LABEL[d.situation] : "")}
        ${row("Stage", d.stage ? STAGE_LABEL[d.stage] : "")}
        ${row("Timeline", d.timeline ? TIMELINE_LABEL[d.timeline] : "")}
        ${row("Budget", d.budget ? BUDGET_LABEL[d.budget] : "")}
        ${row("Objective", d.objective)}
        ${row("Stack", d.stack ?? "")}
        ${row("Compliance", d.compliance ?? "")}
        ${row("Links", d.links ?? "")}
      </table>
    </div>
  `;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
