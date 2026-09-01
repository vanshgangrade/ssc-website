import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { setLivePoll, setPollStatus, setPollOpen, setPollClosesAt, renamePoll, deletePoll } from "@/lib/poll";

const bodySchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  status: z.enum(["DRAFT", "LIVE", "CLOSED", "ARCHIVED"]).optional(),
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

  const { title, status, isOpen, closesAt } = parsed.data;

  if (title !== undefined) await renamePoll(id, title);
  // Going live is a special case: it must also demote whatever poll was live before it.
  if (status === "LIVE") {
    await setLivePoll(id);
  } else if (status !== undefined) {
    await setPollStatus(id, status);
  }
  if (isOpen !== undefined) await setPollOpen(id, isOpen);
  if (closesAt !== undefined) await setPollClosesAt(id, closesAt ? new Date(closesAt) : null);

  const poll = await prisma.poll.findUnique({
    where: { id },
    include: { _count: { select: { movies: true, votes: true } } },
  });
  if (!poll) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }
  return NextResponse.json({ poll });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  try {
    // onDelete: Cascade means this also removes that poll's movies and votes.
    await deletePoll(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }
}
