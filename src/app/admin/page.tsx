import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPollState } from "@/lib/poll";
import PollToggle from "./_components/PollToggle";
import MovieManager from "./_components/MovieManager";
import ExportButton from "./_components/ExportButton";
import "./admin.css";

export default async function AdminPage() {
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

  const [votes, movies, pollState, recommendations] = await Promise.all([
    prisma.vote.findMany({
      include: { user: { select: { email: true, name: true } }, movie: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.movie.findMany({ orderBy: { order: "asc" } }),
    getPollState(),
    prisma.recommendation.findMany({
      include: { user: { select: { email: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const counts: Record<string, number> = Object.fromEntries(movies.map((m: any) => [m.id, 0]));
  for (const v of votes) {
    if (v.movieId in counts) counts[v.movieId] += 1;
  }
  const total = votes.length;

  return (
    <main className="admin-wrap">
      <div className="admin-header">
        <div>
          <p className="admin-eyebrow">Silver Screen Club</p>
          <h1>Admin — Poll Results</h1>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <form
            action={async () => {
              "use server";
              const s = await auth();
              if (s?.user?.isAdmin) {
                await prisma.session.deleteMany();
              }
            }}
          >
            <button className="admin-btn admin-btn-ghost" type="submit" style={{ color: "var(--ember)", borderColor: "rgba(192, 67, 44, 0.3)" }}>
              Force Logout All
            </button>
          </form>
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

      <PollToggle
        initialOpen={pollState.isOpen}
        initialClosesAt={pollState.closesAt ? pollState.closesAt.toISOString() : null}
      />

      <section className="admin-card">
        <h2>
          Standings ({total} vote{total === 1 ? "" : "s"})
        </h2>
        <div className="admin-bars">
          {movies.map((m: any) => {
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
        <MovieManager initialMovies={movies} />
      </section>

      <section className="admin-card">
        <h2>Voters</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Vote</th>
                <th>Cast at</th>
                <th>Last changed</th>
              </tr>
            </thead>
            <tbody>
              {votes.map((v: any) => (
                <tr key={v.userId}>
                  <td>{v.user.email}</td>
                  <td>{v.user.name ?? "—"}</td>
                  <td>{v.movie.name}</td>
                  <td>{v.createdAt.toLocaleString()}</td>
                  <td>{v.updatedAt.toLocaleString()}</td>
                </tr>
              ))}
              {votes.length === 0 && (
                <tr>
                  <td colSpan={5} className="admin-empty">
                    No votes cast yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
          <h2 style={{ margin: 0 }}>
            Movie Recommendations ({recommendations.length})
          </h2>
          <ExportButton recommendations={recommendations.map((r: any) => ({
            id: r.id,
            movieName: r.movieName,
            createdAt: r.createdAt.toISOString(),
            user: r.user,
          }))} />
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Movie Name</th>
                <th>Recommended By (Email)</th>
                <th>Recommended By (Name)</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recommendations.map((r: any, i: number) => (
                <tr key={r.id}>
                  <td>{i + 1}</td>
                  <td><strong>{r.movieName}</strong></td>
                  <td>{r.user.email}</td>
                  <td>{r.user.name ?? "—"}</td>
                  <td>{r.createdAt.toLocaleString()}</td>
                </tr>
              ))}
              {recommendations.length === 0 && (
                <tr>
                  <td colSpan={5} className="admin-empty">
                    No recommendations yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
