import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { votes, movies as moviesTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isPollOpen } from "@/lib/poll";
import { sendVoteConfirmationEmail } from "@/lib/email";

const voteSchema = z.object({
  movieId: z.string().min(1),
});

// Deliberately returns only *this user's* vote — never aggregate counts.
// Totals are admin-only (see /api/admin/stats) so results stay hidden until reveal.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const res = await db.select().from(votes).where(eq(votes.userId, session.user.id)).limit(1);
  const vote = res[0];
  const pollOpen = await isPollOpen();

  return NextResponse.json({
    myVote: vote?.movieId ?? null,
    pollOpen,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = voteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid movie selection" }, { status: 400 });
  }

  if (!(await isPollOpen())) {
    return NextResponse.json({ error: "Voting is closed" }, { status: 403 });
  }

  const { movieId } = parsed.data;
  const mRes = await db.select().from(moviesTable).where(eq(moviesTable.id, movieId)).limit(1);
  const movie = mRes[0];
  if (!movie) {
    return NextResponse.json({ error: "That movie no longer exists" }, { status: 400 });
  }

  // Upsert on the unique userId is what makes "one vote per email" hold even
  // under concurrent requests — a second vote updates the same row, never inserts a new one.
  const voteRes = await db.insert(votes)
    .values({ userId: session.user.id, movieId })
    .onConflictDoUpdate({ target: votes.userId, set: { movieId, updatedAt: new Date() } })
    .returning();
  const vote = voteRes[0];

  await sendVoteConfirmationEmail(session.user.email, movie.name);

  return NextResponse.json({ myVote: vote.movieId });
}
