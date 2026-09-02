import { auth } from "@/lib/auth";
import { db } from "@/db";
import { movies as moviesTable } from "@/db/schema";
import { getPollState } from "@/lib/poll";
import Ballot from "@/components/Ballot";

export default async function Home() {
  const [session, movies, pollState] = await Promise.all([
    auth(),
    db.select({
      id: moviesTable.id, name: moviesTable.name, meta: moviesTable.meta, tagline: moviesTable.tagline, posterUrl: moviesTable.posterUrl, trailerUrl: moviesTable.trailerUrl, tmdbId: moviesTable.tmdbId
    }).from(moviesTable).orderBy(moviesTable.order),
    getPollState(),
  ]);

  const sessionSummary = session?.user
    ? {
        email: session.user.email ?? "",
        name: session.user.name ?? null,
        image: session.user.image ?? null,
        isAdmin: session.user.isAdmin,
      }
    : null;

  return (
    <Ballot
      session={sessionSummary}
      movies={movies}
      initialPollOpen={pollState.isOpen}
      initialClosesAt={pollState.closesAt ? pollState.closesAt.toISOString() : null}
    />
  );
}
