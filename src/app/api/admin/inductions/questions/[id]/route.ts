import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { questionInputSchema } from "@/lib/inductions/validation";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = questionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const q = parsed.data;
  const question = await prisma.inductionQuestion.update({
    where: { id },
    data: {
      prompt: q.prompt,
      hint: q.hint || null,
      type: q.type,
      options: q.options,
      required: q.required,
      maxLength: q.maxLength ?? null,
      onlyFor: q.onlyFor,
    },
  });

  return NextResponse.json({ question });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.inductionQuestion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
