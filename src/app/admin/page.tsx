import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { db } from "@/db";
import { movies as moviesTable, votes as votesTable, users, recommendations as recsTable, emailLogs as emailLogsTable, sessions } from "@/db/schema";
import { desc, asc, eq, sql } from "drizzle-orm";
import { getPollState } from "@/lib/poll";
import PollToggle from "./_components/PollToggle";
import MovieManager from "./_components/MovieManager";
import ExportButton from "./_components/ExportButton";
import PaginatedVoters from "./_components/PaginatedVoters";
import PaginatedRecommendations from "./_components/PaginatedRecommendations";
import PaginatedEmailLogs from "./_components/PaginatedEmailLogs";
import EmailTester from "./_components/EmailTester";
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

  const [votesData, movies, pollState] = await Promise.all([
    db.select({
      id: votesTable.id,
      userId: votesTable.userId,
      movieId: votesTable.movieId,
      createdAt: votesTable.createdAt,
      updatedAt: votesTable.updatedAt,
      user: { email: users.email, name: users.name },
      movie: { name: moviesTable.name },
    })
    .from(votesTable)
    .innerJoin(users, eq(votesTable.userId, users.id))
    .innerJoin(moviesTable, eq(votesTable.movieId, moviesTable.id))
    .orderBy(desc(votesTable.createdAt)),
    db.select().from(moviesTable).orderBy(asc(moviesTable.order)),
    getPollState(),
  ]);

  let recommendations: any[] = [];
  let emailLogs: any[] = [];
  let isTableMissing = false;
  try {
    recommendations = await db.select({
      id: recsTable.id,
      movieName: recsTable.movieName,
      createdAt: recsTable.createdAt,
      user: { email: users.email, name: users.name },
    })
    .from(recsTable)
    .innerJoin(users, eq(recsTable.userId, users.id))
    .orderBy(desc(recsTable.createdAt));

    emailLogs = await db.select().from(emailLogsTable).orderBy(desc(emailLogsTable.createdAt)).limit(100);
  } catch (e) {
    console.error("Failed to fetch auxiliary tables, might be missing:", e);
    isTableMissing = true;
  }

  const counts: Record<string, number> = Object.fromEntries(movies.map((m: any) => [m.id, 0]));
  for (const v of votesData) {
    if (v.movieId in counts) counts[v.movieId] += 1;
  }
  const total = votesData.length;

  return (
    <main className="admin-wrap">
      {isTableMissing && (
        <div style={{ background: "var(--ember)", color: "white", padding: "16px", borderRadius: "8px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong>Database Migration Required!</strong> The tables don't exist yet. Run drizzle-kit push.
          </div>
        </div>
      )}

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
                await db.delete(sessions);
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
        <PaginatedVoters votes={votesData.map(v => ({
          ...v,
          createdAt: v.createdAt.toISOString(),
          updatedAt: v.updatedAt.toISOString(),
        }))} />
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
        <PaginatedRecommendations recommendations={recommendations.map((r: any) => ({
          id: r.id,
          movieName: r.movieName,
          createdAt: r.createdAt.toISOString(),
          user: r.user,
        }))} />
      </section>

      <section className="admin-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
          <h2 style={{ margin: 0 }}>Email Delivery Logs</h2>
          <div style={{ fontSize: "14px", color: "var(--ash)" }}>
            Resend: {emailLogs.filter(l => l.provider === "resend").length} | ZeptoMail: {emailLogs.filter(l => l.provider === "zeptomail").length} | MailerSend: {emailLogs.filter(l => l.provider === "mailersend").length}
          </div>
        </div>
        <EmailTester />
        <PaginatedEmailLogs logs={emailLogs.map((l: any) => ({
          ...l,
          createdAt: l.createdAt.toISOString(),
        }))} />
      </section>
    </main>
  );
}
