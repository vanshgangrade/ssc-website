import Link from "next/link";
import type { FilmStats, FilmSummary } from "@/lib/films";
import { Stars } from "./Stars";
import "@/components/ballot.css";
import "./films.css";

export default function FilmIndex({ films }: { films: { film: FilmSummary; stats: FilmStats }[] }) {
  return (
    <div className="ssc diary">
      <header className="nav">
        <div className="s-wrap">
          <a className="brand" href="/">
            SSC
          </a>
          <nav className="dnav" aria-label="Site">
            <Link href="/films" aria-current="page">
              Film diary
            </Link>
            <Link href="/vote">Vote</Link>
          </nav>
        </div>
      </header>

      <main className="s-wrap index">
        <span className="sign off">
          <span>Film diary</span>
        </span>
        <h2>
          Rate what we <span className="hl">screened</span>
        </h2>
        <p className="lead">Every film the club puts on the big screen gets a page here. Give it stars, write a review, see what the campus thought.</p>

        {films.length === 0 ? (
          <p className="empty">No films in the diary yet.</p>
        ) : (
          <ol className="fgrid">
            {films.map(({ film, stats }) => (
              <li key={film.slug}>
                <Link className="fcard" href={`/films/${film.slug}`}>
                  <span className="glass">
                    <span className="poster">
                      {/* eslint-disable-next-line @next/next/no-img-element -- posters may be data: URIs */}
                      <img src={film.posterUrl} alt="" loading="lazy" />
                    </span>
                  </span>
                  <span className="ftitle">{film.title}</span>
                  <span className="fstats">
                    <Stars value={(stats.average ?? 0) * 2} size="1rem" label={stats.average !== null ? `Average ${stats.average} out of 5 stars` : "No ratings yet"} />
                    <span>{stats.count ? `${stats.average?.toFixed(1)} · ${stats.count} ${stats.count === 1 ? "rating" : "ratings"}` : "Be the first to rate"}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </main>
    </div>
  );
}
