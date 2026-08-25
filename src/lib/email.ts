import { prisma } from "./prisma";

const RESEND_API_URL = "https://api.resend.com/emails";
const resendApiKey = process.env.RESEND_API_KEY;

const ZEPTOMAIL_API_URL = "https://api.zeptomail.in/v1.1/email";
const zeptoApiKey = process.env.ZEPTO_API_KEY;

/**
 * Attempts to send an email via Resend first. 
 * If it fails (e.g. rate limit reached), it falls back to ZeptoMail.
 */
async function sendEmailWithFallback(to: string, subject: string, htmlbody: string) {
  const from = process.env.EMAIL_FROM;
  if (!from) {
    console.warn("EMAIL_FROM not set — skipping email.");
    return;
  }

  let resendFailed = false;

  // --- Attempt 1: Resend ---
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
        // Log success for resend
        await prisma.emailLog.create({
          data: { to, subject, provider: "resend", status: "success" }
        }).catch(e => console.error("Failed to log email:", e));
        return; // Successfully sent via Resend
      }
      
      const errorText = await resendRes.text();
      console.warn(`Resend failed with status ${resendRes.status}. Falling back to ZeptoMail. Error: ${errorText}`);
      resendFailed = true;
    } catch (err) {
      console.warn("Resend request threw an error. Falling back to ZeptoMail.", err);
      resendFailed = true;
    }
  } else {
    console.warn("RESEND_API_KEY not set, jumping to ZeptoMail fallback.");
    resendFailed = true;
  }

  // --- Attempt 2: ZeptoMail Fallback ---
  if (resendFailed) {
    if (!zeptoApiKey) {
      console.warn("ZEPTO_API_KEY not set — fallback failed.");
      await prisma.emailLog.create({
        data: { to, subject, provider: "failed", status: "error", errorMsg: "Missing ZeptoMail key" }
      }).catch(e => console.error("Failed to log email:", e));
      return;
    }

    try {
      const zeptoRes = await fetch(ZEPTOMAIL_API_URL, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": zeptoApiKey,
        },
        body: JSON.stringify({
          from: { address: from },
          to: [{ email_address: { address: to } }],
          subject: subject,
          htmlbody: htmlbody,
        }),
      });

      if (!zeptoRes.ok) {
        const errorText = await zeptoRes.text();
        console.error(`ZeptoMail fallback also failed with status ${zeptoRes.status}: ${errorText}`);
        await prisma.emailLog.create({
          data: { to, subject, provider: "zeptomail", status: "error", errorMsg: errorText }
        }).catch(e => console.error("Failed to log email:", e));
      } else {
        console.log("Successfully sent email via ZeptoMail fallback.");
        await prisma.emailLog.create({
          data: { to, subject, provider: "zeptomail", status: "success" }
        }).catch(e => console.error("Failed to log email:", e));
      }
    } catch (err) {
      console.error("ZeptoMail fallback request threw an error:", err);
      await prisma.emailLog.create({
        data: { to, subject, provider: "zeptomail", status: "error", errorMsg: String(err) }
      }).catch(e => console.error("Failed to log email:", e));
    }
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
