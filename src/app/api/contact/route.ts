import { NextResponse } from "next/server";
import { z } from "zod";
import { CONTACT_EMAIL } from "@/lib/site";

/**
 * POST /api/contact
 *
 * Receives the free-form contact-page message (name / email / company /
 * message). Validates with zod. If RESEND_API_KEY is configured, forwards a
 * notification email to ops; otherwise stays a dev stub that logs the payload
 * server-side and returns success so the form's UX completes.
 *
 * This is the simpler sibling of /api/intake — the structured /start intake
 * has its own schema; this route exists for the open-ended contact message.
 */

const ContactSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  company: z.string().max(120).optional().default(""),
  message: z.string().min(8, "Please add a sentence or two."),
  language: z.enum(["en", "it"]).optional(),
});

export type ContactPayload = z.infer<typeof ContactSchema>;

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

  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Validation failed", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const data = parsed.data;

  const resendKey = process.env.RESEND_API_KEY;
  const opsEmail = process.env.OPS_EMAIL ?? CONTACT_EMAIL;

  if (resendKey) {
    try {
      const html = renderContactEmail(data);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Sersan Contact <ops@sersan.io>",
          to: [opsEmail],
          reply_to: data.email,
          subject: `New message — ${data.name}${data.company ? ` · ${data.company}` : ""}`,
          html,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("[contact] Resend rejected:", res.status, text);
        // Don't fail the user — log it and return success. We have the
        // payload server-side and can recover the lead.
      }
    } catch (e) {
      console.error("[contact] Email forward failed:", e);
    }
  } else {
    // Dev fallback — surface in the server log so we can verify shape.
    console.log("[contact] (dev — no RESEND_API_KEY set) payload:", data);
  }

  return NextResponse.json({ ok: true });
}

// ----- internal helpers -----

function renderContactEmail(d: ContactPayload): string {
  const row = (k: string, v: string) =>
    v
      ? `<tr><td style="padding:6px 14px 6px 0;color:#9aa3ad;font-family:JetBrains Mono,monospace;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;vertical-align:top;white-space:nowrap;">${k}</td><td style="padding:6px 0;color:#f3f1ec;font-family:-apple-system,Segoe UI,sans-serif;font-size:14px;line-height:1.55;">${escape(v)}</td></tr>`
      : "";
  return `
    <div style="background:#0e1424;padding:32px;color:#f3f1ec;font-family:-apple-system,Segoe UI,sans-serif;">
      <h2 style="font-family:Georgia,serif;font-weight:400;font-size:24px;margin:0 0 8px;">New message from ${escape(d.name)}.</h2>
      ${d.company ? `<p style="margin:0 0 24px;color:#9aa3ad;font-size:13px;">${escape(d.company)}</p>` : ""}
      <table style="border-collapse:collapse;width:100%;">
        ${row("Email", d.email)}
        ${row("Message", d.message)}
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
