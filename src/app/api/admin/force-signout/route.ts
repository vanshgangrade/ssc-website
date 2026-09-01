import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Database session strategy means every request re-checks the Session table,
// so wiping it immediately signs out every browser holding a session cookie —
// including, deliberately, the admin who clicked this.
export async function POST() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { count } = await prisma.session.deleteMany();
  return NextResponse.json({ ok: true, count });
}
