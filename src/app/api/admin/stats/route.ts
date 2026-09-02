import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { movies as moviesTable, votes, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [movies, votesList] = await Promise.all([
    db.select({ id: moviesTable.id, name: moviesTable.name })
      .from(moviesTable)
      .orderBy(moviesTable.order),
    db.select({
      movieId: votes.movieId,
      createdAt: votes.createdAt,
      updatedAt: votes.updatedAt,
      user: { email: users.email, name: users.name },
      movie: { name: moviesTable.name },
    })
    .from(votes)
    .innerJoin(users, eq(votes.userId, users.id))
    .innerJoin(moviesTable, eq(votes.movieId, moviesTable.id))
    .orderBy(votes.createdAt),
  ]);

  const counts: Record<string, number> = Object.fromEntries(movies.map((m: any) => [m.id, 0]));
  for (const v of votesList) {
    if (v.movieId in counts) counts[v.movieId] += 1;
  }

  return NextResponse.json({
    total: votesList.length,
    movies,
    counts,
    voters: votesList.map((v: any) => ({
      email: v.user.email,
      name: v.user.name,
      movie: v.movie.name,
      votedAt: v.createdAt,
      updatedAt: v.updatedAt,
    })),
  });
}
