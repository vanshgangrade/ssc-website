"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import type { CommentDTO, ReviewDTO } from "@/lib/films";
import { COMMENT_MAX_CHARS } from "@/lib/filmRules";
import { addComment, deleteComment, removeReview, report, toggleLike } from "@/app/diary/actions";
import { Stars } from "./Stars";
import { shareCard } from "./shareCard";

// What the person looking at the page can do. Moderators see delete options; nobody else can tell who they are.
export type ViewerCaps = { signedIn: boolean; isMod: boolean };

// One review. `show` picks what context to add: who wrote it, which film, or both (the home feed).
export function ReviewItem({
  review,
  base,
  show,
  viewer,
}: {
  review: ReviewDTO;
  base: string;
  show: "author" | "film" | "both";
  viewer: ViewerCaps;
}) {
  const author = show !== "film";
  const film = show !== "author";
  const filmHref = `${base}/film/${review.film.slug}`;
  return (
    <li className={film ? "card rcard with-film" : "card rcard"} id={`review-${review.id}`}>
      {film && (
        <Link className="rposter" href={filmHref} aria-label={review.film.title}>
          {/* eslint-disable-next-line @next/next/no-img-element -- posters may be data: URIs */}
          <img src={review.film.posterUrl} alt="" loading="lazy" />
        </Link>
      )}
      <div className="rmain">
        {film && (
          <Link className="rfilm" href={filmHref}>
            {review.film.title}
          </Link>
        )}
        <div className="rtop">
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
                <ReviewDate review={review} />
              </div>
            </div>
          ) : (
            <ReviewDate review={review} />
          )}
          <ItemMenu
            items={[
              review.mine && { label: "Share as image", run: () => shareReview(review, base) },
              !review.mine && viewer.signedIn && { label: "Report", run: () => reportPrompt({ reviewId: review.id }) },
              !review.mine && viewer.isMod && { label: "Delete review", danger: true, run: () => confirmThen("Delete this review for everyone?", () => removeReview(review.id)) },
            ]}
          />
        </div>
        <ReviewBody review={review} />
        <ReviewActions review={review} base={base} viewer={viewer} threaded={review.comments !== null} />
      </div>
    </li>
  );
}

function ReviewDate({ review }: { review: ReviewDTO }) {
  return (
    <p className="rdate">
      {formatDate(review.createdAt)}
      {review.edited && " · edited"}
      {review.atScreening && (
        <span className="badge" title="Watched it at the SSC screening">
          ✓ Watched at the screening
        </span>
      )}
    </p>
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

// Heart + reply count; on the film page the reply count opens the thread in place.
export function ReviewActions({ review, base, viewer, threaded }: { review: ReviewDTO; base: string; viewer: ViewerCaps; threaded: boolean }) {
  const router = useRouter();
  const [liked, setLiked] = useState(review.likedByMe);
  const [likes, setLikes] = useState(review.likes);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  // Keep in step with fresh server data after a refresh.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing optimistic state to new server props
    setLiked(review.likedByMe);
    setLikes(review.likes);
  }, [review.likedByMe, review.likes]);

  // Arriving from a notification or the feed (#review-<id>) opens that thread.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the URL hash is only readable in the browser
    if (threaded && window.location.hash === `#review-${review.id}`) setOpen(true);
  }, [threaded, review.id]);

  function like() {
    if (!viewer.signedIn) {
      signIn("google");
      return;
    }
    if (review.mine || pending) return;
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    start(async () => {
      const res = await toggleLike(review.id);
      if ("error" in res) {
        setLiked(!next);
        setLikes((n) => n + (next ? -1 : 1));
        return;
      }
      router.refresh();
    });
  }

  const replies = review.commentCount;
  return (
    <>
      <div className="ractions">
        <button
          type="button"
          className={liked ? "act liked" : "act"}
          aria-pressed={liked}
          aria-label={liked ? "Unlike" : "Like"}
          disabled={review.mine}
          title={review.mine ? "Likes on your review" : undefined}
          onClick={like}
        >
          <span aria-hidden="true">{liked ? "♥" : "♡"}</span>
          {likes > 0 && <span>{likes}</span>}
        </button>
        {threaded ? (
          <button type="button" className="act" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <span aria-hidden="true">💬</span>
            <span>{replies ? `${replies} ${replies === 1 ? "reply" : "replies"}` : "Reply"}</span>
          </button>
        ) : (
          <Link className="act" href={`${base}/film/${review.film.slug}#review-${review.id}`}>
            <span aria-hidden="true">💬</span>
            <span>{replies ? `${replies} ${replies === 1 ? "reply" : "replies"}` : "Reply"}</span>
          </Link>
        )}
      </div>
      {threaded && open && <Thread review={review} viewer={viewer} />}
    </>
  );
}

function Thread({ review, viewer }: { review: ReviewDTO; viewer: ViewerCaps }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="thread">
      {(review.comments ?? []).length > 0 && (
        <ol className="clist">
          {(review.comments ?? []).map((c) => (
            <CommentRow key={c.id} comment={c} viewer={viewer} />
          ))}
        </ol>
      )}
      {viewer.signedIn ? (
        <form
          className="cform"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            start(async () => {
              const res = await addComment(review.id, text);
              if ("error" in res) {
                setError(res.error);
                return;
              }
              setText("");
              router.refresh();
            });
          }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a reply…"
            rows={2}
            maxLength={COMMENT_MAX_CHARS}
            disabled={pending}
            aria-label="Reply"
          />
          <button className="btn solid" type="submit" disabled={pending || !text.trim()}>
            {pending ? "…" : "Reply"}
          </button>
          {error && <p className="err">{error}</p>}
        </form>
      ) : (
        <button type="button" className="reveal" onClick={() => signIn("google")}>
          Sign in to reply
        </button>
      )}
    </div>
  );
}

function CommentRow({ comment, viewer }: { comment: CommentDTO; viewer: ViewerCaps }) {
  return (
    <li className="crow">
      <Avatar name={comment.author.name} image={comment.author.image} size={26} />
      <div className="cmain">
        <p className="cmeta">
          <b>{comment.author.name}</b> · {formatDate(comment.createdAt)}
        </p>
        <p className="cbody">{comment.body}</p>
      </div>
      <ItemMenu
        items={[
          !comment.mine && viewer.signedIn && { label: "Report", run: () => reportPrompt({ commentId: comment.id }) },
          (comment.mine || viewer.isMod) && {
            label: "Delete reply",
            danger: true,
            run: () => confirmThen(comment.mine ? "Delete your reply?" : "Delete this reply for everyone?", () => deleteComment(comment.id)),
          },
        ]}
      />
    </li>
  );
}

type MenuItem = { label: string; danger?: boolean; run: () => Promise<boolean | void> | void };

// Small "⋯" menu. Renders nothing when there's nothing the viewer can do.
function ItemMenu({ items }: { items: (MenuItem | false | null | undefined)[] }) {
  const router = useRouter();
  const list = items.filter(Boolean) as MenuItem[];
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  if (!list.length) return null;
  return (
    <div className="imenu" ref={ref}>
      <button type="button" className="imenu-btn" aria-label="More" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        ⋯
      </button>
      {open && (
        <div className="acct-menu imenu-list" role="menu">
          {list.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={item.danger ? "acct-out" : undefined}
              onClick={async () => {
                setOpen(false);
                const done = await item.run();
                if (done === true) {
                  setNote(item.label === "Report" ? "Reported. Thanks." : "Done.");
                  router.refresh();
                }
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      {note && (
        <span className="imenu-note" role="status">
          {note}
        </span>
      )}
    </div>
  );
}

async function reportPrompt(target: { reviewId?: string; commentId?: string }): Promise<boolean> {
  const reason = window.prompt("Why are you reporting this? (optional)");
  if (reason === null) return false;
  const res = await report(target, reason);
  if ("error" in res) {
    window.alert(res.error);
    return false;
  }
  return true;
}

async function confirmThen(question: string, act: () => Promise<{ ok: true } | { error: string }>): Promise<boolean> {
  if (!window.confirm(question)) return false;
  const res = await act();
  if ("error" in res) {
    window.alert(res.error);
    return false;
  }
  return true;
}

export async function shareReview(review: ReviewDTO, base: string) {
  const site = `${window.location.host}${base}/film/${review.film.slug}`;
  const result = await shareCard({
    filmTitle: review.film.title,
    posterUrl: review.film.posterUrl,
    rating: review.rating,
    body: review.spoiler ? "" : review.body,
    authorName: review.author.name,
    handle: review.author.handle,
    atScreening: review.atScreening,
    site,
  });
  if (result === "failed") window.alert("Couldn't make the image. Try again.");
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
