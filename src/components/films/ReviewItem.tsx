"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReviewDTO } from "@/lib/films";
import { Stars } from "./Stars";

// One review. `show` picks what context to add: who wrote it, which film, or both (the home feed).
export function ReviewItem({ review, base, show }: { review: ReviewDTO; base: string; show: "author" | "film" | "both" }) {
  const author = show !== "film";
  const film = show !== "author";
  return (
    <li className={film ? "card rcard with-film" : "card rcard"}>
      {film && (
        <Link className="rposter" href={`${base}/film/${review.film.slug}`} aria-label={review.film.title}>
          {/* eslint-disable-next-line @next/next/no-img-element -- posters may be data: URIs */}
          <img src={review.film.posterUrl} alt="" loading="lazy" />
        </Link>
      )}
      <div className="rmain">
        {film && (
          <Link className="rfilm" href={`${base}/film/${review.film.slug}`}>
            {review.film.title}
          </Link>
        )}
        {author ? (
          <div className="rhead">
            <Avatar name={review.author.name} image={review.author.image} />
            <div>
              {review.author.handle ? (
                <Link className="rname" href={`${base}/${review.author.handle}`}>
                  {review.author.name}
                </Link>
              ) : (
                <p className="rname">{review.author.name}</p>
              )}
              <p className="rdate">
                {formatDate(review.createdAt)}
                {review.edited && " · edited"}
              </p>
            </div>
          </div>
        ) : (
          <p className="rdate">
            {formatDate(review.createdAt)}
            {review.edited && " · edited"}
          </p>
        )}
        <ReviewBody review={review} />
      </div>
    </li>
  );
}

export function ReviewBody({ review, open }: { review: ReviewDTO; open?: boolean }) {
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

export function Avatar({ name, image, size = 34 }: { name: string; image: string | null; size?: number }) {
  return image ? (
    // eslint-disable-next-line @next/next/no-img-element -- Google avatar needs no-referrer, which next/image can't set
    <img className="avatar" src={image} alt="" referrerPolicy="no-referrer" width={size} height={size} style={{ width: size, height: size }} />
  ) : (
    <span className="avatar ph" aria-hidden="true" style={{ width: size, height: size, fontSize: size * 0.5 }}>
      {name.charAt(0)}
    </span>
  );
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
