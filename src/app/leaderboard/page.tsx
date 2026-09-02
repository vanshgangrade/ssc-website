import { auth } from "@/lib/auth";
import { db } from "@/db";
import { recommendations } from "@/db/schema";
import { getMovieDetails, getTMDBImage } from "@/lib/tmdb";
import LeaderboardClient from "./LeaderboardClient";
import "./leaderboard.css";

export default async function LeaderboardPage() {
  const session = await auth();

  // Group recommendations by tmdbId or movieName
  const rawRecs = await db.select().from(recommendations);
  
  // Grouping logic
  const groups: Record<string, { count: number; name: string; tmdbId: number | null }> = {};
  for (const r of rawRecs) {
    const key = r.tmdbId ? String(r.tmdbId) : r.movieName;
    if (!groups[key]) {
      groups[key] = { count: 0, name: r.movieName, tmdbId: r.tmdbId };
    }
    groups[key].count++;
  }

  // Sort by count descending, take top 20
  const sorted = Object.values(groups)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // Fetch TMDB info for top items
  const enriched = await Promise.all(
    sorted.map(async (item) => {
      let posterUrl = null;
      let tagline = null;
      let year = null;
      if (item.tmdbId) {
        const details = await getMovieDetails(item.tmdbId).catch(() => null);
        if (details) {
          posterUrl = getTMDBImage(details.poster_path, "w500");
          tagline = details.tagline || details.overview?.slice(0, 100) + "...";
          year = details.release_date?.split("-")[0];
        }
      }
      return {
        ...item,
        posterUrl,
        tagline,
        year,
      };
    })
  );

  const sessionSummary = session?.user
    ? {
        id: session.user.id,
        email: session.user.email ?? "",
        name: session.user.name ?? null,
        image: session.user.image ?? null,
        isAdmin: session.user.isAdmin,
      }
    : null;

  return (
    <main className="leaderboard-wrap">
      <div className="leaderboard-hero">
        <p className="eyebrow">Silver Screen Club</p>
        <h1>Top Recommendations</h1>
        <p className="sub">The movies you all won't shut up about. Upvote your favorites to push them up the chart.</p>
      </div>

      <LeaderboardClient items={enriched} session={sessionSummary} userVotes={rawRecs.filter(r => r.userId === session?.user?.id).map(r => r.tmdbId ? String(r.tmdbId) : r.movieName)} />
      
      <footer style={{ textAlign: "center", padding: "40px 0" }}>
        <a href="/what-should-we-screen-next" className="suggest-new-link">Suggest a new movie →</a>
      </footer>
    </main>
  );
}
