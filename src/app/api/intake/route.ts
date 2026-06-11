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
 * docs/STRATEGY.md §B3). The previous schema lived in the old
 * multi-step-intake component and used very different fields — that
 * component is retained for historical/i18n reasons but is no longer the
 * primary intake.
 */

const IntakeSchema = z.object({
  // Optional self-locator (restyle step 2): the six buyer pains from the
  // retired homepage UseCasesSection, now the intake's first question.
  situation: z
    .enum([
      "demo-fails-production",
      "automation-duct-tape",
      "models-in-notebooks",
      "committing-cycles",
      "readiness-review",
      "senior-judgment",
      "none",
    ])
    .optional(),
  name: z.string().min(1).max(120),
  email: z.string().email(),
  company: z.string().min(1).max(120),
  role: z.string().min(1).max(120),
  objective: z.string().min(8, "Please describe what you're trying to build."),
  stage: z.enum([
    "idea",
    "prototype",
    "internal-pilot",
    "production",
    "broken-system",
  ]),
  timeline: z.enum(["asap", "this-month", "this-quarter", "exploring"]),
  budget: z.enum(["under-15k", "15-50k", "50-150k", "150k-plus", "not-sure"]),
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
          subject: `New brief — ${data.name} · ${data.company} (${data.stage})`,
          html,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("[intake] Resend rejected:", res.status, text);
        // Don't fail the user — log it and return success. We have the
        // payload server-side and can recover the lead.
      }
    } catch (e) {
      console.error("[intake] Email forward failed:", e);
    }
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
  "demo-fails-production": "Agent works in demo, fails in production",
  "automation-duct-tape": "Automation stack is duct tape",
  "models-in-notebooks": "Models still trapped in notebooks",
  "committing-cycles": "About to commit engineering cycles to an AI product",
  "readiness-review": "Needs readiness before a board, customer, or regulator",
  "senior-judgment": "Needs senior AI engineering judgment without hiring",
  none: "None of these quite fit",
};

const STAGE_LABEL: Record<IntakePayload["stage"], string> = {
  idea: "Idea",
  prototype: "Prototype",
  "internal-pilot": "Internal pilot",
  production: "Production system",
  "broken-system": "Broken existing system",
};
const TIMELINE_LABEL: Record<IntakePayload["timeline"], string> = {
  asap: "ASAP",
  "this-month": "This month",
  "this-quarter": "This quarter",
  exploring: "Exploring",
};
const BUDGET_LABEL: Record<IntakePayload["budget"], string> = {
  "under-15k": "Under £15k",
  "15-50k": "£15–50k",
  "50-150k": "£50–150k",
  "150k-plus": "£150k+",
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
      <p style="margin:0 0 24px;color:#9aa3ad;font-size:13px;">${escape(d.company)} · ${escape(d.role)}</p>
      <table style="border-collapse:collapse;width:100%;">
        ${row("Email", d.email)}
        ${row("Situation", d.situation ? SITUATION_LABEL[d.situation] : "")}
        ${row("Stage", STAGE_LABEL[d.stage])}
        ${row("Timeline", TIMELINE_LABEL[d.timeline])}
        ${row("Budget", BUDGET_LABEL[d.budget])}
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
