import type { Metadata } from "next";
import { listFilms } from "@/lib/films";
import FilmIndex from "@/components/films/FilmIndex";

export const metadata: Metadata = {
  title: "Film diary — Silver Screen Club",
  description: "Rate and review the films Silver Screen Club has screened at BITS Pilani, Goa.",
};

// Ratings change as people post, so always read fresh numbers.
export const dynamic = "force-dynamic";

export default async function FilmsPage() {
  const films = await listFilms();
  return <FilmIndex films={films} />;
}
