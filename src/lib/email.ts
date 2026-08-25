const RESEND_API_URL = "https://api.resend.com/emails";
const resendApiKey = process.env.RESEND_API_KEY;

// Best-effort: a failed confirmation email must never block or fail the vote itself.
export async function sendVoteConfirmationEmail(to: string, movieName: string) {
  if (!resendApiKey) {
    console.warn("RESEND_API_KEY not set — skipping confirmation email.");
    return;
  }

  const from = process.env.EMAIL_FROM;
  if (!from) {
    console.warn("EMAIL_FROM not set — skipping confirmation email.");
    return;
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: from,
        to: [to],
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
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Resend rejected the confirmation email:", errorText);
    }
  } catch (err) {
    console.error("Failed to send vote confirmation email:", err);
  }
}

export async function sendRecommendationConfirmationEmail(to: string, movieName: string) {
  if (!resendApiKey) {
    console.warn("RESEND_API_KEY not set — skipping confirmation email.");
    return;
  }

  const from = process.env.EMAIL_FROM;
  if (!from) {
    console.warn("EMAIL_FROM not set — skipping confirmation email.");
    return;
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: from,
        to: [to],
        subject: `Your recommendation is recorded: ${movieName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <p style="letter-spacing:.2em; text-transform:uppercase; font-size:11px; color:#8f8779;">Silver Screen Club</p>
            <h2 style="margin:8px 0 16px;">Recommendation Received</h2>
            <p>Thanks for the suggestion! We've added this to our watchlist:</p>
            <p style="font-size:18px; font-weight:600; margin:12px 0;">${movieName}</p>
            <p style="color:#555;">Our team will review your recommendation for a future screening.</p>
            <p style="margin-top:24px; font-size:12px; color:#999;">Silver Screen Club · BITS Pilani, Goa Campus</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Resend rejected the confirmation email:", errorText);
    }
  } catch (err) {
    console.error("Failed to send recommendation confirmation email:", err);
  }
}
