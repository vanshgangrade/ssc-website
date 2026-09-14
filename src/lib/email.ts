import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { verticalName } from "@/lib/inductions/questions";

// Confirmation emails fail over across providers in this order, each capped
// at its free-tier daily quota (tracked in EmailProviderUsage, reset by UTC
// day). Once a provider's count for today hits its limit, the next one is
// tried; if all are exhausted or unconfigured, the email is dropped (a
// failed confirmation must never block or fail the vote/recommendation).
const PROVIDERS: { name: string; dailyLimit: number; send: SendFn }[] = [
  { name: "resend", dailyLimit: 100, send: sendViaResend },
  { name: "brevo", dailyLimit: 300, send: sendViaBrevo },
  { name: "zeptomail", dailyLimit: 100, send: sendViaZeptoMail },
];

type SendResult = { ok: true } | { ok: false; errorMsg: string };
type SendFn = (to: string, subject: string, html: string) => Promise<SendResult>;

export async function sendVoteConfirmationEmail(to: string, movieName: string) {
  const subject = `Your vote is in: ${movieName}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <p style="letter-spacing:.2em; text-transform:uppercase; font-size:11px; color:#8f8779;">Silver Screen Club</p>
      <h2 style="margin:8px 0 16px;">Ticket punched</h2>
      <p>Your vote has been recorded for:</p>
      <p style="font-size:18px; font-weight:600; margin:12px 0;">${movieName}</p>
      <p style="color:#555;">You can change your vote any time before the poll closes by returning to the ballot and casting a new one, only your latest vote counts.</p>
      <p style="margin-top:24px; font-size:12px; color:#999;">Silver Screen Club · BITS Pilani, Goa Campus</p>
    </div>
  `;
  await sendViaFailoverChain(to, subject, html);
}

export async function sendRecommendationConfirmationEmail(to: string, movieName: string) {
  const subject = `Your recommendation is recorded: ${movieName}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <p style="letter-spacing:.2em; text-transform:uppercase; font-size:11px; color:#8f8779;">Silver Screen Club</p>
      <h2 style="margin:8px 0 16px;">Recommendation Received</h2>
      <p>Thanks for the suggestion! We've added this to our watchlist:</p>
      <p style="font-size:18px; font-weight:600; margin:12px 0;">${movieName}</p>
      <p style="color:#555;">Our team will review your recommendation for a future screening.</p>
      <p style="margin-top:24px; font-size:12px; color:#999;">Silver Screen Club · BITS Pilani, Goa Campus</p>
    </div>
  `;
  await sendViaFailoverChain(to, subject, html);
}

export async function sendApplicationConfirmationEmail(
  to: string,
  fullName: string,
  verticals: string[],
  applicationId: string
) {
  const subject = "Your SSC crew application is in";
  const list = verticals.map((v) => verticalName(v)).join(", ");
  const ref = applicationId.slice(-8).toUpperCase();
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <p style="letter-spacing:.2em; text-transform:uppercase; font-size:11px; color:#8f8779;">Silver Screen Club</p>
      <h2 style="margin:8px 0 16px;">Application received</h2>
      <p>Thanks, ${escapeHtml(fullName)}, your crew induction application is in.</p>
      <p style="margin:12px 0;"><strong>Verticals:</strong> ${escapeHtml(list)}</p>
      <p style="margin:12px 0;"><strong>Reference:</strong> ${ref}</p>
      <p style="color:#555;">Next up is the task round. Watch this inbox, every update from here on comes by email.</p>
      <p style="margin-top:24px; font-size:12px; color:#999;">Silver Screen Club · BITS Pilani, Goa Campus</p>
    </div>
  `;
  await sendViaFailoverChain(to, subject, html);
}

// Applicant-supplied text goes into an HTML email, so escape it rather than
// trusting a name to be free of angle brackets.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Shared by both confirmation senders and the admin "send test email" button,
// so a test send genuinely exercises the same quota-aware failover. Every
// attempt (success or failure) is logged to EmailLog, which backs the admin
// "Email Delivery Logs" dashboard. Returns the provider that succeeded, or
// null if every provider was skipped/unconfigured/failed.
export async function sendViaFailoverChain(to: string, subject: string, html: string): Promise<string | null> {
  for (const provider of PROVIDERS) {
    const withinQuota = await reserveDailyQuota(provider.name, provider.dailyLimit);
    if (!withinQuota) continue;

    const result = await provider.send(to, subject, html);
    if (result.ok) {
      await logEmail(to, subject, provider.name, "success", null);
      return provider.name;
    }
    console.error(`${provider.name} failed to send to ${to}; trying next provider.`, result.errorMsg);
    await logEmail(to, subject, provider.name, "error", result.errorMsg);
  }

  await logEmail(to, subject, "failed", "error", "All providers exhausted, unconfigured, or rejected the request");
  return null;
}

// Lets the admin "Email Delivery Logs" test tool force a specific provider,
// bypassing the failover order (but still subject to that provider's own
// daily quota) — useful for verifying one provider's credentials in isolation.
export async function sendViaSpecificProvider(
  to: string,
  subject: string,
  html: string,
  providerName: string
): Promise<SendResult> {
  const provider = PROVIDERS.find((p) => p.name === providerName);
  if (!provider) return { ok: false, errorMsg: `Unknown provider "${providerName}"` };

  const withinQuota = await reserveDailyQuota(provider.name, provider.dailyLimit);
  if (!withinQuota) return { ok: false, errorMsg: `${provider.name}'s daily quota is already used up` };

  const result = await provider.send(to, subject, html);
  await logEmail(to, subject, result.ok ? provider.name : "failed", result.ok ? "success" : "error", result.ok ? null : result.errorMsg);
  return result;
}

async function logEmail(to: string, subject: string, provider: string, status: "success" | "error", errorMsg: string | null) {
  await prisma.emailLog.create({ data: { to, subject, provider, status, errorMsg } }).catch((err) => {
    console.error("Failed to write EmailLog row:", err);
  });
}

// Atomically bumps today's send count for a provider and reports whether
// this send is still within its daily limit. Ties break in the caller's
// favor (the row is incremented either way), which only matters for the
// rare case of many concurrent requests landing on the exact quota edge.
async function reserveDailyQuota(provider: string, dailyLimit: number): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD
  const usage = await prisma.emailProviderUsage.upsert({
    where: { provider_day: { provider, day } },
    create: { provider, day, count: 1 },
    update: { count: { increment: 1 } },
  });
  return usage.count <= dailyLimit;
}

// "Name <email@domain>" -> { name, email }. All three providers share one
// EMAIL_FROM env var but want the sender split into parts, not a raw string.
function parseFrom(from: string): { name?: string; email: string } {
  const match = from.match(/^(.*?)\s*<(.+)>$/);
  if (match) {
    const name = match[1].replace(/^"|"$/g, "").trim();
    return { name: name || undefined, email: match[2].trim() };
  }
  return { email: from.trim() };
}

async function sendViaResend(to: string, subject: string, html: string): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { ok: false, errorMsg: "RESEND_API_KEY or EMAIL_FROM not set" };

  const resend = new Resend(apiKey);
  // Resend's SDK resolves normally (doesn't throw) on API-level failures like an
  // unverified sending domain or a bad key — that only shows up in `error` here.
  const { error } = await resend.emails.send({ from, to, subject, html });
  if (error) return { ok: false, errorMsg: error.message ?? "Resend rejected the request" };
  return { ok: true };
}

async function sendViaBrevo(to: string, subject: string, html: string): Promise<SendResult> {
  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { ok: false, errorMsg: "BREVO_API_KEY or EMAIL_FROM not set" };

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: parseFrom(from),
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) return { ok: false, errorMsg: await res.text() };
  return { ok: true };
}

async function sendViaZeptoMail(to: string, subject: string, html: string): Promise<SendResult> {
  // Matches the var name already configured in this project's deployment.
  const apiKey = process.env.ZEPTO_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { ok: false, errorMsg: "ZEPTO_API_KEY or EMAIL_FROM not set" };

  const sender = parseFrom(from);
  const res = await fetch("https://api.zeptomail.in/v1.1/email", {
    method: "POST",
    headers: {
      // ZEPTO_API_KEY is expected to already include the "Zoho-enczapikey " prefix.
      Authorization: apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      from: { address: sender.email, name: sender.name },
      to: [{ email_address: { address: to } }],
      subject,
      htmlbody: html,
    }),
  });

  if (!res.ok) return { ok: false, errorMsg: await res.text() };
  return { ok: true };
}
