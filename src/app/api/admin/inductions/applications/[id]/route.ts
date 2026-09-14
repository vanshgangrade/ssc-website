import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reviewSchema } from "@/lib/inductions/validation";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { status, reviewNote } = parsed.data;

  const application = await prisma.application.update({
    where: { id },
    data: {
      status,
      reviewNote: reviewNote ?? null,
      reviewedBy: session.user.email ?? null,
      reviewedAt: new Date(),
    },
    select: { id: true, status: true, reviewNote: true, reviewedBy: true, reviewedAt: true },
  });

  return NextResponse.json({ application });
}
