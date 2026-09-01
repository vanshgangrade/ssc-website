import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendViaSpecificProvider } from "@/lib/email";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { to, provider } = await req.json().catch(() => ({}));
  if (!to || !provider) {
    return NextResponse.json({ error: "Missing to or provider" }, { status: 400 });
  }

  const subject = `Test Email from ${String(provider).toUpperCase()}`;
  const html = `<p>This is a test email sent specifically via ${provider}.</p>`;

  const result = await sendViaSpecificProvider(to, subject, html, provider);
  if (!result.ok) {
    return NextResponse.json({ error: result.errorMsg }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
