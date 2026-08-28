import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

// Confirmation emails fail over across providers in this order, each capped
// at its free-tier daily quota. Once a provider's count for today hits its
// limit, the next one is tried; if all are exhausted or unconfigured, the
// email is dropped (a failed confirmation must never block or fail the vote).
const PROVIDERS: { name: string; dailyLimit: number; send: SendFn }[] = [
  { name: "brevo", dailyLimit: 300, send: sendViaBrevo },
  { name: "resend", dailyLimit: 100, send: sendViaResend },
  { name: "zeptomail", dailyLimit: 100, send: sendViaZeptoMail },
];

type SendFn = (to: string, subject: string, html: string) => Promise<boolean>;

export async function sendVoteConfirmationEmail(to: string, movieName: string) {
  const subject = `Your vote is in: ${movieName}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <p style="letter-spacing:.2em; text-transform:uppercase; font-size:11px; color:#8f8779;">Silver Screen Club</p>
      <h2 style="margin:8px 0 16px;">Ticket punched</h2>
      <p>Your vote has been recorded for:</p>
      <p style="font-size:18px; font-weight:600; margin:12px 0;">${movieName}</p>
      <p style="color:#555;">You can change your vote any time before the poll closes by returning to the ballot and casting a new one — only your latest vote counts.</p>
      <p style="margin-top:24px; font-size:12px; color:#999;">Silver Screen Club · BITS Pilani, Goa Campus</p>
    </div>
  `;

  const sentVia = await sendViaFailoverChain(to, subject, html);
  if (!sentVia) {
    console.error(`All email providers exhausted or unconfigured — could not send confirmation to ${to}.`);
  }
}

// Shared by the vote-confirmation sender and the admin "send test email"
// button, so a test send genuinely exercises the same quota-aware failover.
// Returns the provider name that succeeded, or null if all of them failed.
export async function sendViaFailoverChain(to: string, subject: string, html: string): Promise<string | null> {
  for (const provider of PROVIDERS) {
    const withinQuota = await reserveDailyQuota(provider.name, provider.dailyLimit);
    if (!withinQuota) continue;

    try {
      const sent = await provider.send(to, subject, html);
      if (sent) return provider.name;
      console.error(`${provider.name} failed to send to ${to}; trying next provider.`);
    } catch (err) {
      console.error(`${provider.name} threw while sending:`, err);
    }
  }
  return null;
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
  const match = from.match(/^(.*)<(.+)>$/);
  if (match) {
    const name = match[1].trim();
    return { name: name || undefined, email: match[2].trim() };
  }
  return { email: from.trim() };
}

async function sendViaBrevo(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return false;

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

  if (!res.ok) {
    console.error("Brevo rejected the confirmation email:", await res.text());
    return false;
  }
  return true;
}

async function sendViaResend(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return false;

  const resend = new Resend(apiKey);
  // Resend's SDK resolves normally (doesn't throw) on API-level failures like an
  // unverified sending domain or a bad key — that only shows up in `error` here.
  const { error } = await resend.emails.send({ from, to, subject, html });
  if (error) {
    console.error("Resend rejected the confirmation email:", error);
    return false;
  }
  return true;
}

async function sendViaZeptoMail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.ZEPTOMAIL_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return false;

  const sender = parseFrom(from);
  const res = await fetch("https://api.zeptomail.com/v1.1/email", {
    method: "POST",
    headers: {
      // ZeptoMail API keys are issued with the "Zoho-enczapikey " prefix already
      // attached — only add it if whoever set the env var stripped it.
      Authorization: apiKey.startsWith("Zoho-enczapikey") ? apiKey : `Zoho-enczapikey ${apiKey}`,
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

  if (!res.ok) {
    console.error("ZeptoMail rejected the confirmation email:", await res.text());
    return false;
  }
  return true;
}
