import { prisma } from "./prisma";

const MAILERSEND_API_URL = "https://api.mailersend.com/v1/email";
const mailersendApiKey = process.env.MAILERSEND_API_KEY;

/**
 * Attempts to send an email via MailerSend.
 */
async function sendEmailWithFallback(to: string, subject: string, htmlbody: string) {
  const from = process.env.EMAIL_FROM;
  if (!from) {
    console.warn("EMAIL_FROM not set — skipping email.");
    return;
  }

  // Parse "Name <email@domain.com>" format for providers that need it split
  let fromAddress = from;
  let fromName = undefined;
  const match = from.match(/^(.*?)\s*<(.+)>$/);
  if (match) {
    fromName = match[1].replace(/^"|"$/g, '').trim() || undefined;
    fromAddress = match[2].trim();
  }

  if (!mailersendApiKey) {
    console.warn("MAILERSEND_API_KEY not set — cannot send email.");
    await prisma.emailLog.create({
      data: { to, subject, provider: "failed", status: "error", errorMsg: "Missing MailerSend key" }
    }).catch(e => console.error("Failed to log email:", e));
    return;
  }

  try {
    const mlsnRes = await fetch(MAILERSEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "Authorization": `Bearer ${mailersendApiKey}`,
      },
      body: JSON.stringify({
        from: { email: fromAddress, name: fromName },
        to: [{ email: to }],
        subject: subject,
        html: htmlbody,
      }),
    });

    if (mlsnRes.ok) {
      await prisma.emailLog.create({
        data: { to, subject, provider: "mailersend", status: "success" }
      }).catch(e => console.error("Failed to log email:", e));
      return;
    }

    const errorText = await mlsnRes.text();
    console.error(`MailerSend failed with status ${mlsnRes.status}. Error: ${errorText}`);
    await prisma.emailLog.create({
      data: { to, subject, provider: "mailersend", status: "error", errorMsg: errorText }
    }).catch(e => console.error("Failed to log email:", e));
  } catch (err) {
    console.error("MailerSend threw an error:", err);
    await prisma.emailLog.create({
      data: { to, subject, provider: "mailersend", status: "error", errorMsg: String(err) }
    }).catch(e => console.error("Failed to log email:", e));
  }
}

// Best-effort: a failed confirmation email must never block or fail the vote itself.
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
  await sendEmailWithFallback(to, subject, html);
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
  await sendEmailWithFallback(to, subject, html);
}
