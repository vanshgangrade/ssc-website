import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { questionInputSchema, reorderSchema } from "@/lib/inductions/validation";
import { reorderQuestions, resetQuestionsToDefaults } from "@/lib/inductions/questionStore";

const createSchema = z.object({
  cycleId: z.string().min(1),
  question: questionInputSchema,
});

const actionSchema = z.object({
  cycleId: z.string().min(1),
  action: z.enum(["reorder", "reset"]),
  orderedIds: z.array(z.string()).optional(),
});

/** Adds one question to the end of a cycle's bank. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { cycleId, question } = parsed.data;

  const last = await prisma.inductionQuestion.findFirst({
    where: { cycleId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const created = await prisma.inductionQuestion.create({
    data: {
      cycleId,
      prompt: question.prompt,
      hint: question.hint || null,
      type: question.type,
      options: question.options,
      required: question.required,
      maxLength: question.maxLength ?? null,
      onlyFor: question.onlyFor,
      order: (last?.order ?? 0) + 10,
    },
  });

  return NextResponse.json({ question: created }, { status: 201 });
}

/** Bulk actions on a cycle's bank: reorder, or reset to the code defaults. */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { cycleId, action, orderedIds } = parsed.data;

  if (action === "reorder") {
    const ids = reorderSchema.safeParse({ orderedIds });
    if (!ids.success) {
      return NextResponse.json({ error: "Nothing to reorder." }, { status: 400 });
    }
    await reorderQuestions(cycleId, ids.data.orderedIds);
    return NextResponse.json({ ok: true });
  }

  // Resetting is safe for applications already in: their answers are stored
  // as snapshots of the prompt they were asked, not as references to these
  // rows. It only replaces what future applicants will see.
  const count = await resetQuestionsToDefaults(cycleId);
  return NextResponse.json({ ok: true, count });
}
