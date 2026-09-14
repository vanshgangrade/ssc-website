import { prisma } from "@/lib/prisma";
import { DEFAULT_QUESTIONS, type Question, type QuestionSeed, type QuestionType } from "./questions";

/** Narrows the free-text `type` column back to the union the UI works with. */
function toQuestionType(value: string): QuestionType {
  return value === "long" || value === "choice" || value === "multi" ? value : "short";
}

type Row = {
  id: string;
  prompt: string;
  hint: string | null;
  type: string;
  options: string[];
  required: boolean;
  maxLength: number | null;
  onlyFor: string[];
};

function toQuestion(row: Row): Question {
  return {
    id: row.id,
    prompt: row.prompt,
    hint: row.hint,
    type: toQuestionType(row.type),
    options: row.options,
    required: row.required,
    maxLength: row.maxLength,
    onlyFor: row.onlyFor,
  };
}

/** The cycle's question bank, in display order. */
export async function questionsForCycle(cycleId: string): Promise<Question[]> {
  const rows = await prisma.inductionQuestion.findMany({
    where: { cycleId },
    orderBy: [{ order: "asc" }],
  });
  return rows.map(toQuestion);
}

/**
 * Fills a new cycle's question bank: a copy of the most recent other cycle's
 * questions, or the code defaults when this is the first cycle. Keeps a fresh
 * cycle from opening with an empty form.
 */
export async function seedQuestionsForCycle(cycleId: string): Promise<number> {
  const previous = await prisma.inductionCycle.findFirst({
    where: { id: { not: cycleId } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const seeds: QuestionSeed[] = previous
    ? (await questionsForCycle(previous.id)).map(({ ...q }) => ({
        prompt: q.prompt,
        hint: q.hint,
        type: q.type,
        options: q.options,
        required: q.required,
        maxLength: q.maxLength,
        onlyFor: q.onlyFor,
      }))
    : DEFAULT_QUESTIONS;

  if (seeds.length === 0) return 0;

  await prisma.inductionQuestion.createMany({
    data: seeds.map((q, i) => ({ ...q, cycleId, order: i * 10 })),
  });
  return seeds.length;
}

/** Replaces a cycle's bank with the code defaults. Used by the admin "reset" action. */
export async function resetQuestionsToDefaults(cycleId: string): Promise<number> {
  await prisma.$transaction([
    prisma.inductionQuestion.deleteMany({ where: { cycleId } }),
    prisma.inductionQuestion.createMany({
      data: DEFAULT_QUESTIONS.map((q, i) => ({ ...q, cycleId, order: i * 10 })),
    }),
  ]);
  return DEFAULT_QUESTIONS.length;
}

/**
 * Renumbers a cycle's questions to match the given id order. Ids not in the
 * list keep their relative position at the end.
 */
export async function reorderQuestions(cycleId: string, orderedIds: string[]): Promise<void> {
  await prisma.$transaction(
    orderedIds.map((id, i) =>
      prisma.inductionQuestion.updateMany({ where: { id, cycleId }, data: { order: i * 10 } })
    )
  );
}
