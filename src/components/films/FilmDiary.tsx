"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import type { FilmStats, FilmSummary, ReviewDTO } from "@/lib/films";
import { REVIEW_MAX_CHARS } from "@/lib/filmRules";
import { deleteReview, saveReview } from "@/app/films/actions";
import { StarInput, Stars, starLabel } from "./Stars";
import "@/components/ballot.css";
import "./films.css";

type Css = CSSProperties & Record<`--${string}`, string | number>;
type SessionSummary = { name: string | null; image: string | null } | null;
type Sort = "new" | "high" | "low";

export default function FilmDiary({
  film,
  stats,
  reviews,
  mine,
  session,
}: {
  film: FilmSummary;
  stats: FilmStats;
  reviews: ReviewDTO[];
  mine: ReviewDTO | null;
  session: SessionSummary;
}) {
  const [sort, setSort] = useState<Sort>("new");
  const sorted = useMemo(() => {
    const list = reviews.filter((r) => !r.mine);
    if (sort === "high") return [...list].sort((a, b) => b.rating - a.rating);
    if (sort === "low") return [...list].sort((a, b) => a.rating - b.rating);
    return list;
  }, [reviews, sort]);
  const written = reviews.filter((r) => r.body).length;
  const peak = Math.max(1, ...stats.histogram);

  return (
    <div className="ssc diary" style={{ "--poster": `url("${film.posterUrl}")` } as Css}>
      <header className="nav">
        <div className="s-wrap">
          <a className="brand" href="/">
            SSC
          </a>
          <nav className="dnav" aria-label="Site">
            <Link href="/films">Film diary</Link>
            <Link href="/vote">Vote</Link>
          </nav>
          {session ? (
            <button className="btn ghost" type="button" onClick={() => signOut()}>
              Sign out
            </button>
          ) : (
            <button className="btn ghost" type="button" onClick={() => signIn("google")}>
              Sign in
            </button>
          )}
        </div>
      </header>

      <main>
        {/* the film, with its poster blurred behind it like a lobby lightbox */}
        <section className="film-hero">
          <div className="backdrop" aria-hidden="true" />
          <div className="s-wrap hero-grid">
            <div className="glass hero-poster">
              <span className="poster">
                {/* eslint-disable-next-line @next/next/no-img-element -- posters may be data: URIs */}
                <img src={film.posterUrl} alt={`${film.title} poster`} />
              </span>
            </div>
            <div className="hero-copy">
              <span className="sign off">
                <span>Film diary</span>
              </span>
              <h1>{film.title}</h1>
              <p className="hero-meta">
                {[film.meta, film.year].filter(Boolean).join(" · ")}
                {" · "}Screened by Silver Screen Club
              </p>

              <div className="score">
                <div className="score-num">
                  <b>{stats.average !== null ? stats.average.toFixed(1) : "–"}</b>
                  <span>/ 5</span>
                </div>
                <div>
                  <Stars value={(stats.average ?? 0) * 2} size="1.6rem" label={stats.average !== null ? `Average ${stats.average} out of 5 stars` : "No ratings yet"} />
                  <p className="score-sub">
                    {stats.count ? `${stats.count} ${stats.count === 1 ? "rating" : "ratings"} · ${written} ${written === 1 ? "review" : "reviews"}` : "No ratings yet"}
                  </p>
                </div>
              </div>

              <div className="histo" role="img" aria-label={histogramLabel(stats)}>
                <span className="histo-end">½★</span>
                <div className="histo-bars">
                  {stats.histogram.map((n, i) => (
                    <i key={i} style={{ height: `${Math.max(4, (n / peak) * 100)}%` }} className={n ? "" : "zero"} title={`${starLabel(i + 1)}★ · ${n}`} />
                  ))}
                </div>
                <span className="histo-end">★★★★★</span>
              </div>
            </div>
          </div>
        </section>

        <section className="s-wrap">
          <YourReview film={film} mine={mine} session={session} />
        </section>

        <section className="s-wrap reviews">
          <div className="reviews-head">
            <h2>
              What the campus <span className="hl">thought</span>
            </h2>
            {sorted.length > 1 && (
              <label className="sort">
                <span>Sort</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                  <option value="new">Newest</option>
                  <option value="high">Highest rated</option>
                  <option value="low">Lowest rated</option>
                </select>
              </label>
            )}
          </div>
          {sorted.length === 0 ? (
            <p className="empty">{mine ? "Yours is the only one so far. Tell your friends." : "No reviews yet. Be the first to log it."}</p>
          ) : (
            <ol className="rlist">
              {sorted.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </ol>
          )}
        </section>
      </main>

      <footer className="b-foot">
        <div className="s-wrap">
          <p className="billing">
            Silver Screen Club <small>presents</small> The Film Diary <small>written by</small> The Whole Campus
          </p>
          <Link className="btn ghost" href="/films">
            All films
          </Link>
        </div>
      </footer>
    </div>
  );
}

function YourReview({ film, mine, session }: { film: FilmSummary; mine: ReviewDTO | null; session: SessionSummary }) {
  const router = useRouter();
  const [editing, setEditing] = useState(!mine);
  const [rating, setRating] = useState(mine?.rating ?? 0);
  const [body, setBody] = useState(mine?.body ?? "");
  const [spoiler, setSpoiler] = useState(mine?.spoiler ?? false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  if (!session) {
    return (
      <div className="card yours">
        <p className="yours-title">Seen it?</p>
        <p className="muted">Sign in with your BITS Google account to rate {film.title} and write a review.</p>
        <button className="btn solid" type="button" onClick={() => signIn("google")}>
          Sign in to rate
        </button>
      </div>
    );
  }

  if (mine && !editing) {
    return (
      <div className="card yours">
        <div className="yours-row">
          <p className="yours-title">Your review</p>
          {saved && <span className="saved">Saved ✓</span>}
        </div>
        <ReviewBody review={mine} open />
        <div className="yours-actions">
          <button
            className="btn ghost"
            type="button"
            onClick={() => {
              setSaved(false);
              setEditing(true);
            }}
          >
            Edit
          </button>
          <button
            className="btn ghost danger"
            type="button"
            disabled={pending}
            onClick={() => {
              if (!window.confirm("Delete your rating and review?")) return;
              start(async () => {
                const res = await deleteReview(film.slug);
                if ("error" in res) {
                  setError(res.error);
                  return;
                }
                setRating(0);
                setBody("");
                setSpoiler(false);
                setEditing(true);
                router.refresh();
              });
            }}
          >
            Delete
          </button>
        </div>
        {error && <p className="err">{error}</p>}
      </div>
    );
  }

  if (!film.reviewsOpen) {
    return (
      <div className="card yours">
        <p className="yours-title">Reviews are closed</p>
        <p className="muted">The diary for this film isn&apos;t taking new ratings right now.</p>
      </div>
    );
  }

  return (
    <form
      className="card yours"
      onSubmit={(e) => {
        e.preventDefault();
        if (!rating) {
          setError("Tap the stars to pick a rating first.");
          return;
        }
        setError(null);
        start(async () => {
          const res = await saveReview({ slug: film.slug, rating, body, spoiler });
          if ("error" in res) {
            setError(res.error);
            return;
          }
          setSaved(true);
          setEditing(false);
          router.refresh();
        });
      }}
    >
      <div className="yours-row">
        <p className="yours-title">{mine ? "Edit your review" : "Log this film"}</p>
        {session.name && <span className="muted small">as {session.name}</span>}
      </div>
      <StarInput value={rating} onChange={setRating} disabled={pending} />
      <label className="field">
        <span className="sr">Your review (optional)</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a review… (optional)"
          rows={4}
          maxLength={REVIEW_MAX_CHARS}
          disabled={pending}
        />
        <span className="count">
          {body.length} / {REVIEW_MAX_CHARS}
        </span>
      </label>
      <label className="check">
        <input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} disabled={pending || !body.trim()} />
        <span>Contains spoilers</span>
      </label>
      {error && (
        <p className="err" role="alert">
          {error}
        </p>
      )}
      <div className="yours-actions">
        <button className="btn solid" type="submit" disabled={pending}>
          {pending ? "Saving…" : mine ? "Save changes" : "Post"}
        </button>
        {mine && (
          <button
            className="btn ghost"
            type="button"
            disabled={pending}
            onClick={() => {
              setRating(mine.rating);
              setBody(mine.body);
              setSpoiler(mine.spoiler);
              setError(null);
              setEditing(false);
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function ReviewCard({ review }: { review: ReviewDTO }) {
  return (
    <li className="card rcard">
      <div className="rhead">
        {review.author.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- Google avatar needs no-referrer, which next/image can't set
          <img className="avatar" src={review.author.image} alt="" referrerPolicy="no-referrer" width={34} height={34} />
        ) : (
          <span className="avatar ph" aria-hidden="true">
            {review.author.name.charAt(0)}
          </span>
        )}
        <div>
          <p className="rname">{review.author.name}</p>
          <p className="rdate">
            {formatDate(review.createdAt)}
            {review.edited && " · edited"}
          </p>
        </div>
      </div>
      <ReviewBody review={review} />
    </li>
  );
}

function ReviewBody({ review, open }: { review: ReviewDTO; open?: boolean }) {
  const [shown, setShown] = useState(!review.spoiler || open === true);
  return (
    <>
      <Stars value={review.rating} size="1.2rem" />
      {review.body &&
        (shown ? (
          <p className="rbody">{review.body}</p>
        ) : (
          <p className="rbody hidden">
            This review contains spoilers.{" "}
            <button type="button" className="reveal" onClick={() => setShown(true)}>
              Show it
            </button>
          </p>
        ))}
    </>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function histogramLabel(stats: FilmStats): string {
  if (!stats.count) return "No ratings yet";
  return stats.histogram.map((n, i) => `${starLabel(i + 1)} stars: ${n}`).join(", ");
}
