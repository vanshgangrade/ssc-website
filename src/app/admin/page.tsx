import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  const [votes, movies, pollState] = await Promise.all([
    prisma.vote.findMany({
      include: { user: { select: { email: true, name: true } }, movie: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.movie.findMany({ orderBy: { order: "asc" } }),
    getPollState(),
  ]);

  let recommendations: any[] = [];
  let emailLogs: any[] = [];
  let isTableMissing = false;
  try {
    recommendations = await prisma.recommendation.findMany({
      include: { user: { select: { email: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    emailLogs = await prisma.emailLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100, // show latest 100
    });
  } catch (e) {
    console.error("Failed to fetch auxiliary tables, might be missing:", e);
    isTableMissing = true;
  }

  const counts: Record<string, number> = Object.fromEntries(movies.map((m: any) => [m.id, 0]));
  for (const v of votes) {
    if (v.movieId in counts) counts[v.movieId] += 1;
  }
  const total = votes.length;

  return (
    <main className="admin-wrap">
      {isTableMissing && (
        <div style={{ background: "var(--ember)", color: "white", padding: "16px", borderRadius: "8px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong>Database Migration Required!</strong> The Recommendation table doesn't exist yet.
          </div>
          <form action={async () => {
            "use server";
            const isPostgres = process.env.DATABASE_URL?.includes("postgres") || process.env.DATABASE_URL?.includes("supabase") || process.env.POSTGRES_URL;
            if (isPostgres) {
              await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS "Recommendation" (
                  "id" TEXT NOT NULL,
                  "userId" TEXT NOT NULL,
                  "movieName" TEXT NOT NULL,
                  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
                );
              `);
              await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS "EmailLog" (
                  "id" TEXT NOT NULL,
                  "to" TEXT NOT NULL,
                  "subject" TEXT NOT NULL,
                  "provider" TEXT NOT NULL,
                  "status" TEXT NOT NULL,
                  "errorMsg" TEXT,
                  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
                );
              `);
              // Try to add foreign key, ignore if it already exists or fails
              try {
                await prisma.$executeRawUnsafe(`
                  ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
                `);
              } catch (e) {
                console.error("Failed to add foreign key:", e);
              }
            }
          }}>
            <button type="submit" style={{ background: "white", color: "var(--ember)", padding: "8px 16px", borderRadius: "4px", fontWeight: "bold" }}>
              Fix Database Now
            </button>
          </form>
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
        <PaginatedVoters votes={votes.map(v => ({
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
            Resend: {emailLogs.filter(l => l.provider === "resend").length} | ZeptoMail: {emailLogs.filter(l => l.provider === "zeptomail").length}
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
