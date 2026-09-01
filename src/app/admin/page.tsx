import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listPolls } from "@/lib/poll";
import PollsManager from "./_components/PollsManager";
import PollToggle from "./_components/PollToggle";
import MovieManager from "./_components/MovieManager";
import ForceSignOutButton from "./_components/ForceSignOutButton";
import PaginatedVoters from "./_components/PaginatedVoters";
import PaginatedRecommendations from "./_components/PaginatedRecommendations";
import PaginatedEmailLogs from "./_components/PaginatedEmailLogs";
import ExportButton from "./_components/ExportButton";
import EmailTester from "./_components/EmailTester";
import "./admin.css";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ poll?: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin?callbackUrl=/admin");
  }
  if (!session.user.isAdmin) {
    return (
      <main className="admin-wrap">
        <div className="admin-card">
          <h1>Not authorized</h1>
          <p>{session.user.email} is not on the admin list.</p>
        </div>
      </main>
    );
  }

  const polls = await listPolls();
  const { poll: pollParam } = await searchParams;
  const livePoll = polls.find((p) => p.status === "LIVE");
  const selectedPoll = polls.find((p) => p.id === pollParam) ?? livePoll ?? polls[0] ?? null;

  const [votes, movies, recommendations, emailLogs] = await Promise.all([
    selectedPoll
      ? prisma.vote.findMany({
          where: { pollId: selectedPoll.id },
          include: { user: { select: { email: true, name: true } }, movie: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    selectedPoll
      ? prisma.movie.findMany({ where: { pollId: selectedPoll.id }, orderBy: { order: "asc" } })
      : Promise.resolve([]),
    prisma.recommendation.findMany({
      include: { user: { select: { email: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
  ]);

  const counts: Record<string, number> = Object.fromEntries(movies.map((m) => [m.id, 0]));
  for (const v of votes) {
    if (v.movieId in counts) counts[v.movieId] += 1;
  }
  const total = votes.length;

  return (
    <main className="admin-wrap">
      <div className="admin-header">
        <div>
          <p className="admin-eyebrow">Silver Screen Club</p>
          <h1>Admin — Polls</h1>
        </div>
        <div className="admin-header-actions">
          <ForceSignOutButton />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button className="admin-btn admin-btn-ghost" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>

      <section className="admin-card">
        <h2>Polls</h2>
        <PollsManager polls={polls} selectedPollId={selectedPoll?.id ?? null} />
      </section>

      {!selectedPoll && (
        <section className="admin-card">
          <p className="admin-empty">Create a poll above to get started.</p>
        </section>
      )}

      {selectedPoll && (
        <>
          <section className="admin-card">
            <h2>
              Managing: {selectedPoll.title}{" "}
              {selectedPoll.status === "LIVE" && <span className="poll-status-pill live">Live</span>}
            </h2>
            <PollToggle
              key={selectedPoll.id}
              pollId={selectedPoll.id}
              initialOpen={selectedPoll.isOpen}
              initialClosesAt={selectedPoll.closesAt ? selectedPoll.closesAt.toISOString() : null}
            />
          </section>

          <section className="admin-card">
            <h2>
              Standings ({total} vote{total === 1 ? "" : "s"})
            </h2>
            <div className="admin-bars">
              {movies.map((m) => {
                const pct = total > 0 ? Math.round((counts[m.id] / total) * 100) : 0;
                return (
                  <div key={m.id} className="admin-bar-row">
                    <div className="admin-bar-label">
                      <span>{m.name}</span>
                      <span>
                        {counts[m.id]} · {pct}%
                      </span>
                    </div>
                    <div className="admin-bar-track">
                      <div className="admin-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {movies.length === 0 && <p className="admin-empty">No movies yet.</p>}
            </div>
          </section>

          <section className="admin-card">
            <h2>Movies</h2>
            <MovieManager key={selectedPoll.id} pollId={selectedPoll.id} initialMovies={movies} />
          </section>

          <section className="admin-card">
            <h2>Voters</h2>
            <PaginatedVoters
              votes={votes.map((v) => ({
                userId: v.userId,
                createdAt: v.createdAt.toISOString(),
                updatedAt: v.updatedAt.toISOString(),
                user: v.user,
                movie: v.movie,
              }))}
            />
          </section>
        </>
      )}

      <section className="admin-card">
        <div className="admin-section-head">
          <h2>Movie Recommendations ({recommendations.length})</h2>
          <ExportButton
            recommendations={recommendations.map((r) => ({
              id: r.id,
              movieName: r.movieName,
              createdAt: r.createdAt.toISOString(),
              user: r.user,
            }))}
          />
        </div>
        <PaginatedRecommendations
          recommendations={recommendations.map((r) => ({
            id: r.id,
            movieName: r.movieName,
            createdAt: r.createdAt.toISOString(),
            user: r.user,
          }))}
        />
      </section>

      <section className="admin-card">
        <div className="admin-section-head">
          <h2>Email Delivery Logs</h2>
          <div className="admin-provider-tally">
            Resend: {emailLogs.filter((l) => l.provider === "resend").length} · Brevo:{" "}
            {emailLogs.filter((l) => l.provider === "brevo").length} · ZeptoMail:{" "}
            {emailLogs.filter((l) => l.provider === "zeptomail").length}
          </div>
        </div>
        <EmailTester />
        <PaginatedEmailLogs
          logs={emailLogs.map((l) => ({
            ...l,
            createdAt: l.createdAt.toISOString(),
          }))}
        />
      </section>
    </main>
  );
}
