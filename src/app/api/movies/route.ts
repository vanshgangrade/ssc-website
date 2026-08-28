import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPollState } from "@/lib/poll";

// Public — film details only, never vote counts. Scoped to whichever poll is live.
export async function GET() {
  const { pollId } = await getPollState();
  if (!pollId) return NextResponse.json({ movies: [] });

  const movies = await prisma.movie.findMany({
    where: { pollId },
    orderBy: { order: "asc" },
    select: { id: true, name: true, meta: true, tagline: true, posterUrl: true },
  });
  return NextResponse.json({ movies });
}
