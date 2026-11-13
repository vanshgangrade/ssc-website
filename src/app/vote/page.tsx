import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPollState } from "@/lib/poll";
import Ballot from "@/components/Ballot";

export default async function Home() {
  const [session, pollState] = await Promise.all([auth(), getPollState()]);
  const movies = pollState.pollId
    ? await prisma.movie.findMany({
        where: { pollId: pollState.pollId },
        orderBy: { order: "asc" },
        select: { id: true, name: true, meta: true, tagline: true, posterUrl: true },
      })
    : [];

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
