import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { movieInputSchema } from "@/lib/movieValidation";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const pollId = new URL(req.url).searchParams.get("pollId");
  if (!pollId) {
    return NextResponse.json({ error: "pollId is required" }, { status: 400 });
  }
  const movies = await prisma.movie.findMany({ where: { pollId }, orderBy: { order: "asc" } });
  return NextResponse.json({ movies });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = movieInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const maxOrder = await prisma.movie.aggregate({
    where: { pollId: parsed.data.pollId },
    _max: { order: true },
  });
  const movie = await prisma.movie.create({
    data: { ...parsed.data, order: parsed.data.order ?? (maxOrder._max.order ?? -1) + 1 },
  });

  return NextResponse.json({ movie }, { status: 201 });
}
