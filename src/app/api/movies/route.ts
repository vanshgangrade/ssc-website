import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public — film details only, never vote counts.
export async function GET() {
  const movies = await prisma.movie.findMany({
    orderBy: { order: "asc" },
    select: { id: true, name: true, meta: true, tagline: true, posterUrl: true },
  });
  return NextResponse.json({ movies });
}
