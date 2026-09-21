import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { summarizeApplication } from "@/lib/inductions/summarize";
import type { StoredAnswer } from "@/lib/inductions/validation";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const application = await prisma.application.findUnique({
    where: { id },
    select: { fullName: true, yearOfStudy: true, verticals: true, answers: true },
  });
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const result = await summarizeApplication({
    fullName: application.fullName,
    yearOfStudy: application.yearOfStudy,
    verticals: application.verticals,
    answers: (application.answers ?? []) as unknown as StoredAnswer[],
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ summary: result.summary });
}
