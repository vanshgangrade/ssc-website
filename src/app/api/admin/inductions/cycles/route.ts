import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  title: z.string().trim().min(1, "Give the cycle a title.").max(120),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  // A new cycle starts closed on purpose — set the deadline first, then open
  // it deliberately, rather than going live the instant it's created.
  const cycle = await prisma.inductionCycle.create({
    data: { title: parsed.data.title, isOpen: false },
  });

  return NextResponse.json({ cycle }, { status: 201 });
}
