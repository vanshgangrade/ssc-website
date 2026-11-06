import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPollState } from "@/lib/poll";

// Public live tally for the current poll: counts per movie only, never who voted.
export async function GET() {
  const { pollId } = await getPollState();
  const noStore = { headers: { "Cache-Control": "no-store" } };
  if (!pollId) return NextResponse.json({ total: 0, counts: {} }, noStore);

  const grouped = await prisma.vote.groupBy({
    by: ["movieId"],
    where: { pollId },
    _count: { _all: true },
  });

  const counts: Record<string, number> = {};
  let total = 0;
  for (const g of grouped) {
    counts[g.movieId] = g._count._all;
    total += g._count._all;
  }
  return NextResponse.json({ total, counts }, noStore);
}
