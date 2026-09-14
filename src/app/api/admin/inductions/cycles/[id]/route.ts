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

/**
 * Deletes a cycle. Both InductionQuestion and Application cascade from it, so
 * this also throws away every application that came in on that cycle.
 *
 * An empty cycle deletes on request. A cycle with applications on it needs
 * `confirmTitle` to match the cycle's title exactly, so wiping real
 * applications takes a deliberate act of typing rather than one stray click.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const cycle = await prisma.inductionCycle.findUnique({
    where: { id },
    select: { id: true, title: true, _count: { select: { applications: true } } },
  });
  if (!cycle) {
    return NextResponse.json({ error: "That cycle no longer exists." }, { status: 404 });
  }

  const applications = cycle._count.applications;

  if (applications > 0) {
    const body = await req.json().catch(() => null);
    const confirmTitle = typeof body?.confirmTitle === "string" ? body.confirmTitle.trim() : "";
    if (confirmTitle !== cycle.title) {
      return NextResponse.json(
        {
          error: `This cycle has ${applications} application(s). Type the cycle title exactly to confirm.`,
          requiresConfirmation: true,
          title: cycle.title,
          applications,
        },
        { status: 409 }
      );
    }
  }

  await prisma.inductionCycle.delete({ where: { id } });
  return NextResponse.json({ ok: true, deletedApplications: applications });
}
