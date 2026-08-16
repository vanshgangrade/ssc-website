import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [movies, votes] = await Promise.all([
    prisma.movie.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true } }),
    prisma.vote.findMany({
      include: { user: { select: { email: true, name: true } }, movie: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const counts: Record<string, number> = Object.fromEntries(movies.map((m: any) => [m.id, 0]));
  for (const v of votes) {
    if (v.movieId in counts) counts[v.movieId] += 1;
  }

  return NextResponse.json({
    total: votes.length,
    movies,
    counts,
    voters: votes.map((v: any) => ({
      email: v.user.email,
      name: v.user.name,
      movie: v.movie.name,
      votedAt: v.createdAt,
      updatedAt: v.updatedAt,
    })),
  });
}
