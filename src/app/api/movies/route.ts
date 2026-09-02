import { NextResponse } from "next/server";
import { db } from "@/db";
import { movies } from "@/db/schema";

// Public — film details only, never vote counts.
export async function GET() {
  const moviesRes = await db.select({
    id: movies.id, name: movies.name, meta: movies.meta, tagline: movies.tagline, posterUrl: movies.posterUrl
  }).from(movies).orderBy(movies.order);
  return NextResponse.json({ movies: moviesRes });
}
