import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Resend } from "resend";

export async function POST() {
  const session = await auth();
  if (!session?.user?.isAdmin || !session.user.email) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey) return NextResponse.json({ error: "RESEND_API_KEY is not set" }, { status: 500 });
  if (!from) return NextResponse.json({ error: "EMAIL_FROM is not set" }, { status: 500 });

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to: session.user.email,
    subject: "SSC poll — test email",
    html: `<p>This is a test email from the Silver Screen Club poll admin panel. If you got this, Resend is wired up correctly.</p>`,
  });

  if (error) {
    return NextResponse.json({ error: error.message ?? "Resend rejected the request" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, id: data?.id });
}
