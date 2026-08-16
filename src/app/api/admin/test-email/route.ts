import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST() {
  const session = await auth();
  if (!session?.user?.isAdmin || !session.user.email) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const zeptoApiKey = process.env.ZEPTO_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!zeptoApiKey) return NextResponse.json({ error: "ZEPTO_API_KEY is not set" }, { status: 500 });
  if (!from) return NextResponse.json({ error: "EMAIL_FROM is not set" }, { status: 500 });

  try {
    const response = await fetch("https://api.zeptomail.in/v1.1/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": zeptoApiKey,
      },
      body: JSON.stringify({
        from: { address: from },
        to: [{ email_address: { address: session.user.email } }],
        subject: "SSC poll — test email",
        htmlbody: "<p>This is a test email from the Silver Screen Club poll admin panel. If you got this, ZeptoMail is wired up correctly.</p>",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `ZeptoMail rejected the request: ${errorText}` }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "ZeptoMail rejected the request" }, { status: 502 });
  }
}
