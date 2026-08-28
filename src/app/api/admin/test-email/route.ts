import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendViaFailoverChain } from "@/lib/email";

export async function POST() {
  const session = await auth();
  if (!session?.user?.isAdmin || !session.user.email) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const provider = await sendViaFailoverChain(
    session.user.email,
    "SSC poll — test email",
    `<p>This is a test email from the Silver Screen Club poll admin panel. If you got this, the email pipeline is wired up correctly.</p>`
  );

  if (!provider) {
    return NextResponse.json(
      { error: "All email providers are unconfigured, exhausted, or rejected the request" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, provider });
}
