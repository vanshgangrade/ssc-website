import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPollState, isPollOpen } from "@/lib/poll";
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

  const { pollId } = await getPollState();
  const pollOpen = await isPollOpen();

  if (!pollId) {
    return NextResponse.json({ myVote: null, pollOpen: false });
  }

  const vote = await prisma.vote.findUnique({
    where: { userId_pollId: { userId: session.user.id, pollId } },
  });

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

  const { pollId } = await getPollState();
  if (!pollId) {
    return NextResponse.json({ error: "No poll is currently live" }, { status: 403 });
  }
  if (!(await isPollOpen())) {
    return NextResponse.json({ error: "Voting is closed" }, { status: 403 });
  }

  const { movieId } = parsed.data;
  // Scoped to the live poll so a movie id from a past poll can't be voted for.
  const movie = await prisma.movie.findFirst({ where: { id: movieId, pollId } });
  if (!movie) {
    return NextResponse.json({ error: "That movie no longer exists" }, { status: 400 });
  }

  // Upsert on the unique (userId, pollId) is what makes "one vote per email per
  // poll" hold even under concurrent requests — a second vote in the same poll
  // updates the same row, never inserts a new one.
  const vote = await prisma.vote.upsert({
    where: { userId_pollId: { userId: session.user.id, pollId } },
    create: { userId: session.user.id, pollId, movieId },
    update: { movieId },
  });

  await sendVoteConfirmationEmail(session.user.email, movie.name);

  return NextResponse.json({ myVote: vote.movieId });
}
