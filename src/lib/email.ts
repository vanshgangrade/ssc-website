import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

// Best-effort: a failed confirmation email must never block or fail the vote itself.
export async function sendVoteConfirmationEmail(to: string, movieName: string) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping confirmation email.");
    return;
  }

  const from = process.env.EMAIL_FROM;
  if (!from) {
    console.warn("EMAIL_FROM not set — skipping confirmation email.");
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from,
      to,
      subject: `Your vote is in: ${movieName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <p style="letter-spacing:.2em; text-transform:uppercase; font-size:11px; color:#8f8779;">Silver Screen Club</p>
          <h2 style="margin:8px 0 16px;">Ticket punched</h2>
          <p>Your vote has been recorded for:</p>
          <p style="font-size:18px; font-weight:600; margin:12px 0;">${movieName}</p>
          <p style="color:#555;">You can change your vote any time before the poll closes by returning to the ballot and casting a new one — only your latest vote counts.</p>
          <p style="margin-top:24px; font-size:12px; color:#999;">Silver Screen Club · BITS Pilani, Goa Campus</p>
        </div>
      `,
    });
    // Resend's SDK resolves normally (doesn't throw) on API-level failures like an
    // unverified sending domain or a bad key — that only shows up in `error` here.
    if (error) {
      console.error("Resend rejected the confirmation email:", error);
    }
  } catch (err) {
    console.error("Failed to send vote confirmation email:", err);
  }
}
