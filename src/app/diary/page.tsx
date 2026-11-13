import Link from "next/link";
import { auth } from "@/lib/auth";
import { getRecentReviews, listFilms } from "@/lib/films";
import { getDiaryBase } from "@/lib/diaryServer";
import { ReviewItem } from "@/components/films/ReviewItem";
import { Stars } from "@/components/films/Stars";

// Ratings change as people post, so always read fresh numbers.
export const dynamic = "force-dynamic";

export default async function DiaryHome() {
  const [session, base] = await Promise.all([auth(), getDiaryBase()]);
  const [films, recent] = await Promise.all([listFilms(), getRecentReviews(12, session?.user?.id ?? null)]);
  const open = films.filter((f) => f.film.reviewsOpen);
  const featured = open[0] ?? films[0] ?? null;

  return (
    <main>
      <section className="s-wrap dhero">
        <span className="sign off">
          <span>SSC Film Diary</span>
        </span>
        <h1>
          Rate what we <span className="hl">screened.</span>
        </h1>
        <p className="lead">
          Every film Silver Screen Club puts on the big screen gets a page here. Give it stars, write a review, and keep your own diary of everything you&apos;ve watched with the club.
        </p>
      </section>

      {featured && (
        <section className="s-wrap">
          <Link className="feat card" href={`${base}/film/${featured.film.slug}`} style={{ ["--poster" as string]: `url("${featured.film.posterUrl}")` }}>
            <span className="feat-bg" aria-hidden="true" />
            <span className="glass feat-poster">
              <span className="poster">
                {/* eslint-disable-next-line @next/next/no-img-element -- posters may be data: URIs */}
                <img src={featured.film.posterUrl} alt="" />
              </span>
            </span>
            <span className="feat-copy">
              <span className="feat-k">{featured.film.reviewsOpen ? "Now open for reviews" : "Latest screening"}</span>
              <span className="feat-t">{featured.film.title}</span>
              <span className="feat-stats">
                <Stars value={(featured.stats.average ?? 0) * 2} size="1.4rem" />
                <span>
                  {featured.stats.count
                    ? `${featured.stats.average?.toFixed(1)} from ${featured.stats.count} ${featured.stats.count === 1 ? "rating" : "ratings"}`
                    : "No ratings yet. Be the first."}
                </span>
              </span>
              <span className="btn solid">Rate &amp; review</span>
            </span>
          </Link>
        </section>
      )}

      {films.length > 1 && (
        <section className="s-wrap reviews">
          <h2>
            All <span className="hl">films</span>
          </h2>
          <ol className="fgrid">
            {films.map(({ film, stats }) => (
              <li key={film.slug}>
                <Link className="fcard" href={`${base}/film/${film.slug}`}>
                  <span className="glass">
                    <span className="poster">
                      {/* eslint-disable-next-line @next/next/no-img-element -- posters may be data: URIs */}
                      <img src={film.posterUrl} alt="" loading="lazy" />
                    </span>
                  </span>
                  <span className="ftitle">{film.title}</span>
                  <span className="fstats">
                    <Stars value={(stats.average ?? 0) * 2} size="1rem" />
                    <span>{stats.count ? `${stats.average?.toFixed(1)} · ${stats.count} ${stats.count === 1 ? "rating" : "ratings"}` : "Be the first to rate"}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="s-wrap reviews">
        <h2>
          Just <span className="hl">logged</span>
        </h2>
        {recent.length === 0 ? (
          <p className="empty">No reviews yet. The first one could be yours.</p>
        ) : (
          <ol className="rlist">
            {recent.map((r) => (
              <ReviewItem key={r.id} review={r} base={base} show="both" />
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
