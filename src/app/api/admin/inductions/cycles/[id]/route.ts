import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  isOpen: z.boolean().optional(),
  // ISO string to set a deadline, null to clear it. Omit to leave unchanged.
  closesAt: z.string().datetime().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { title, isOpen, closesAt } = parsed.data;

  const cycle = await prisma.inductionCycle.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(isOpen !== undefined ? { isOpen } : {}),
      ...(closesAt !== undefined ? { closesAt: closesAt ? new Date(closesAt) : null } : {}),
    },
  });

  return NextResponse.json({ cycle });
}
