import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  const vote = await prisma.vote.findUnique({ where: { userId: session.user.id } });
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
  const movie = await prisma.movie.findUnique({ where: { id: movieId } });
  if (!movie) {
    return NextResponse.json({ error: "That movie no longer exists" }, { status: 400 });
  }

  // Upsert on the unique userId is what makes "one vote per email" hold even
  // under concurrent requests — a second vote updates the same row, never inserts a new one.
  const vote = await prisma.vote.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, movieId },
    update: { movieId },
  });

  await sendVoteConfirmationEmail(session.user.email, movie.name);

  return NextResponse.json({ myVote: vote.movieId });
}
