import { prisma } from "./prisma";

const RESEND_API_URL = "https://api.resend.com/emails";
const resendApiKey = process.env.RESEND_API_KEY;

const ZEPTOMAIL_API_URL = "https://api.zeptomail.in/v1.1/email";
const zeptoApiKey = process.env.ZEPTO_API_KEY;

const MAILERSEND_API_URL = "https://api.mailersend.com/v1/email";
const mailersendApiKey = process.env.MAILERSEND_API_KEY;

/**
 * Attempts to send an email via MailerSend first.
 * If it fails, it falls back to ZeptoMail.
 * If ZeptoMail fails, it falls back to Resend.
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

  // --- Attempt 1: MailerSend ---
  if (mailersendApiKey) {
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
      console.error(`MailerSend failed with status ${mlsnRes.status}. Falling back to ZeptoMail. Error: ${errorText}`);
    } catch (err) {
      console.error("MailerSend threw an error. Falling back to ZeptoMail:", err);
    }
  }

  // --- Attempt 2: ZeptoMail ---
  if (zeptoApiKey) {
    try {
      const zeptoRes = await fetch(ZEPTOMAIL_API_URL, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": zeptoApiKey,
        },
        body: JSON.stringify({
          from: { address: fromAddress, name: fromName },
          to: [{ email_address: { address: to } }],
          subject: subject,
          htmlbody: htmlbody,
        }),
      });

      if (zeptoRes.ok) {
        await prisma.emailLog.create({
          data: { to, subject, provider: "zeptomail", status: "success" }
        }).catch(e => console.error("Failed to log email:", e));
        return;
      }
      
      const errorText = await zeptoRes.text();
      console.warn(`ZeptoMail failed with status ${zeptoRes.status}. Falling back to Resend. Error: ${errorText}`);
    } catch (err) {
      console.warn("ZeptoMail fallback threw an error. Falling back to Resend.", err);
    }
  }

  // --- Attempt 3: Resend Fallback ---
  if (resendApiKey) {
    try {
      const resendRes = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: from,
          to: [to],
          subject: subject,
          html: htmlbody,
        }),
      });

      if (resendRes.ok) {
        await prisma.emailLog.create({
          data: { to, subject, provider: "resend", status: "success" }
        }).catch(e => console.error("Failed to log email:", e));
        return; 
      }
      
      const errorText = await resendRes.text();
      console.warn(`Resend fallback failed with status ${resendRes.status}. Error: ${errorText}`);
      await prisma.emailLog.create({
        data: { to, subject, provider: "resend", status: "error", errorMsg: errorText }
      }).catch(e => console.error("Failed to log email:", e));
    } catch (err) {
      console.warn("Resend request threw an error.", err);
      await prisma.emailLog.create({
        data: { to, subject, provider: "resend", status: "error", errorMsg: String(err) }
      }).catch(e => console.error("Failed to log email:", e));
    }
  } else {
    console.warn("No keys set or all fallbacks exhausted.");
    await prisma.emailLog.create({
      data: { to, subject, provider: "failed", status: "error", errorMsg: "All providers failed or missing keys" }
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
