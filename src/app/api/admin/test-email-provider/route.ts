import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { to, provider } = await req.json();
  if (!to || !provider) {
    return NextResponse.json({ error: "Missing to or provider" }, { status: 400 });
  }

  const from = process.env.EMAIL_FROM;
  if (!from) {
    return NextResponse.json({ error: "EMAIL_FROM not set on server" }, { status: 500 });
  }

  const subject = `Test Email from ${provider.toUpperCase()}`;
  const html = `<p>This is a test email sent specifically via ${provider}.</p>`;

  let isSuccess = false;
  let errorMsg = "";

  if (provider === "resend") {
    const key = process.env.RESEND_API_KEY;
    if (!key) return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });
    
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
        body: JSON.stringify({ from, to: [to], subject, html }),
      });
      if (res.ok) isSuccess = true;
      else errorMsg = await res.text();
    } catch (e: any) { errorMsg = String(e); }
  } 
  else if (provider === "zeptomail") {
    const key = process.env.ZEPTO_API_KEY;
    if (!key) return NextResponse.json({ error: "ZEPTO_API_KEY not set" }, { status: 500 });

    try {
      const res = await fetch("https://api.zeptomail.in/v1.1/email", {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": key },
        body: JSON.stringify({
          from: { address: from },
          to: [{ email_address: { address: to } }],
          subject, htmlbody: html,
        }),
      });
      if (res.ok) isSuccess = true;
      else errorMsg = await res.text();
    } catch (e: any) { errorMsg = String(e); }
  }

  // Log it
  await prisma.emailLog.create({
    data: {
      to, subject,
      provider: isSuccess ? provider : "failed",
      status: isSuccess ? "success" : "error",
      errorMsg: errorMsg || null
    }
  }).catch(console.error);

  if (isSuccess) {
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
