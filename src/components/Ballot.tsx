"use client";

import { useEffect, useRef, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import type { MovieDTO } from "@/lib/movies";

type SessionSummary = {
  email: string;
  name: string | null;
  image: string | null;
  isAdmin: boolean;
} | null;

export default function Ballot({
  session,
  movies,
  initialPollOpen,
  initialClosesAt,
}: {
  session: SessionSummary;
  movies: MovieDTO[];
  initialPollOpen: boolean;
  initialClosesAt: string | null;
}) {
  const [myVote, setMyVote] = useState<string | null>(null);
  const [pollOpen, setPollOpen] = useState(initialPollOpen);
  const [closesAt] = useState(initialClosesAt);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ballotRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const countdown = useCountdown(closesAt);
  const closed = !pollOpen || countdown?.expired === true;

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    fetch("/api/vote")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setMyVote(data.myVote);
          setPollOpen(data.pollOpen);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [session]);

  async function castVote(movieId: string) {
    if (!session) {
      signIn("google");
      return;
    }
    if (myVote === movieId || pending) return;

    setError(null);
    setPending(movieId);
    const prevVote = myVote;
    setMyVote(movieId);

    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Vote failed");
      }
    } catch (err) {
      setMyVote(prevVote);
      setError(err instanceof Error ? err.message : "Could not save your vote. Try again.");
    } finally {
      setPending(null);
    }
  }

  function scrollToBallot() {
    ballotRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }

  useIntroAnimation(introRef, reduced);

  const myPick = movies.find((m) => m.id === myVote);

  return (
    <>
      <div className="rail left">
        <div className="rail-holes" />
      </div>
      <div className="rail right">
        <div className="rail-holes" />
      </div>

      <div ref={introRef}>
        <div className="curtain-panel l" />
        <div className="curtain-panel r" />
        <div className="curtain-label">
          <span>SILVER SCREEN CLUB</span>
          <strong>NOW BOARDING</strong>
        </div>
      </div>

      <header className="hero">
        <div className="wrap">
          <div className="bulbs">
            {Array.from({ length: 7 }).map((_, i) => (
              <div className="bulb" key={i} />
            ))}
          </div>
          <p className="eyebrow">Silver Screen Club Presents</p>
          <h1 className="title">
            CAST YOUR
            <em>VOTE</em>
          </h1>
          <p className="sub">
            Three reels are in the can. One gets threaded through the projector next. You decide
            which. <s className="rigged-note">The polls are totally not rigged.</s>
          </p>

          {session ? (
            <div className="auth-chip">
              {session.image && (
                // eslint-disable-next-line @next/next/no-img-element -- Google avatar needs no-referrer, which next/image can't set
                <img src={session.image} alt="" referrerPolicy="no-referrer" width={22} height={22} />
              )}
              <span className="auth-email">{session.email}</span>
              <button className="auth-signout" onClick={() => signOut()}>
                sign out
              </button>
            </div>
          ) : (
            <button className="signin-btn" onClick={() => signIn("google")}>
              Sign in with Google to vote
            </button>
          )}

          {countdown && !countdown.expired && !closed && (
            <p className="countdown">
              <span className="countdown-label">Voting closes in</span>
              <span className="countdown-value">{countdown.text}</span>
            </p>
          )}

          {closed && <p className="poll-closed-banner">Voting is currently closed</p>}

          <button className="scrollcue" onClick={scrollToBallot} aria-label="Scroll to ballot" />
          <p className="scroll-label">Scroll</p>
        </div>
      </header>

      <main>
        <div className="wrap wrap-wide">
          <div className="section-head" ref={ballotRef}>
            <p className="eyebrow">The Ballot</p>
            <h2>{movies.length} Reels, One Screen</h2>
            <p>
              Tap a ticket to punch your vote. You can change it any time before the projector
              rolls.
            </p>
          </div>

          <div className="ballot">
            {movies.map((movie, i) => (
              <ReelCard
                key={movie.id}
                movie={movie}
                index={i}
                isMine={myVote === movie.id}
                isPending={pending === movie.id}
                disabled={closed || pending !== null}
                onVote={() => castVote(movie.id)}
              />
            ))}
            {movies.length === 0 && <p className="admin-empty">No movies on the ballot yet.</p>}
          </div>

          {error && <p className="vote-error">{error}</p>}

          {myPick && (
            <div className="your-pick">
              Your pick: <strong>{myPick.name}</strong> ·{" "}
              <button className="change-link" onClick={scrollToBallot}>
                change vote
              </button>
            </div>
          )}

          <section className="results">
            <div className="section-head" style={{ paddingTop: 20 }}>
              <p className="live-tag">
                <span className="live-dot" />
                Standings
              </p>
              <h2>Where The Club Stands</h2>
              <p>It&apos;ll be revealed later.</p>
            </div>
          </section>
        </div>
      </main>

      <footer>
        <p className="fmark">SSC</p>
        <p className="fsub">Silver Screen Club · BITS Pilani, Goa Campus</p>
        {session?.isAdmin && (
          <p className="fadmin">
            <a href="/admin">Admin panel</a>
          </p>
        )}
      </footer>
    </>
  );
}

function ReelCard({
  movie,
  index,
  isMine,
  isPending,
  disabled,
  onVote,
}: {
  movie: MovieDTO;
  index: number;
  isMine: boolean;
  isPending: boolean;
  disabled: boolean;
  onVote: () => void;
}) {
  return (
    <article className="reel-card" data-film={movie.id}>
      <p className="reel-no">Reel {String(index + 1).padStart(2, "0")}</p>
      <div className="poster-frame">
        {/* eslint-disable-next-line @next/next/no-img-element -- posters can be admin-uploaded data: URIs, which next/image can't optimize */}
        <img src={movie.posterUrl} alt={`${movie.name} poster`} loading="lazy" />
      </div>
      <h3 className="film-title">{movie.name}</h3>
      <p className="film-meta">{movie.meta}</p>
      <p className="film-tagline">{movie.tagline}</p>
      <div className="vote-row">
        <button
          className="vote-btn"
          data-voted={isMine ? "true" : "false"}
          aria-pressed={isMine}
          disabled={disabled && !isMine}
          onClick={onVote}
        >
          <span>{isPending ? "Punching…" : isMine ? "Your ticket" : "Punch this ticket"}</span>
          <span className="stub-arrow">✂</span>
        </button>
      </div>
    </article>
  );
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Reading a browser-only media query can't happen during SSR/first paint,
    // so this one-time sync after mount is intentional, not a missed derivation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(mql.matches);
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function formatCountdown(msLeft: number): string {
  const totalSeconds = Math.max(0, Math.floor(msLeft / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (days || hours) parts.push(`${hours}h`);
  if (days || hours || minutes) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(" ");
}

function useCountdown(closesAtIso: string | null): { text: string; expired: boolean } | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!closesAtIso) return;
    // Same rationale as useReducedMotion: current time is only meaningful client-side.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [closesAtIso]);

  if (!closesAtIso || now === null) return null;
  const diff = new Date(closesAtIso).getTime() - now;
  if (diff <= 0) return { text: "Voting has ended", expired: true };
  return { text: formatCountdown(diff), expired: false };
}

function useIntroAnimation(ref: React.RefObject<HTMLDivElement | null>, reduced: boolean) {
  useEffect(() => {
    let ctx: { revert: () => void } | undefined;
    let cancelled = false;

    async function run() {
      const gsapModule = await import("gsap");
      const ScrollTriggerModule = await import("gsap/ScrollTrigger");
      const gsap = gsapModule.gsap;
      const ScrollTrigger = ScrollTriggerModule.ScrollTrigger;
      if (cancelled) return;

      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: "power3.inOut" } });
        tl.to(".curtain-label", { opacity: 0, duration: 0.5, delay: reduced ? 0 : 0.9 })
          .to(".curtain-panel.l", { xPercent: -100, duration: reduced ? 0.01 : 1.1 }, reduced ? 0 : "<")
          .to(".curtain-panel.r", { xPercent: 100, duration: reduced ? 0.01 : 1.1 }, "<")
          .set(".curtain-panel.l, .curtain-panel.r, .curtain-label", { display: "none" })
          .from(".bulbs .bulb", { opacity: 0.15, stagger: 0.06, duration: 0.4 }, "-=0.6")
          .from(".eyebrow", { y: 14, opacity: 0, duration: 0.5 }, "-=0.3")
          .from(".title", { y: 24, opacity: 0, duration: 0.6 }, "-=0.35")
          .from(".sub", { y: 14, opacity: 0, duration: 0.5 }, "-=0.35");

        if (!reduced) {
          gsap.to(".bulbs .bulb", {
            boxShadow: "0 0 10px 2px rgba(232,179,65,.85)",
            backgroundColor: "#e8b341",
            stagger: { each: 0.15, repeat: -1, yoyo: true },
            duration: 0.9,
            repeat: -1,
            yoyo: true,
            delay: 1.6,
          });
          gsap.to(".scrollcue", { y: 8, opacity: 0.5, duration: 0.9, repeat: -1, yoyo: true, ease: "power1.inOut" });

          gsap.to(".rail.left .rail-holes", {
            y: -260,
            ease: "none",
            scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 0.6 },
          });
          gsap.to(".rail.right .rail-holes", {
            y: -180,
            ease: "none",
            scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 0.4 },
          });

          gsap.utils.toArray<HTMLElement>(".reel-card").forEach((card, i) => {
            gsap.from(card, {
              y: 70,
              opacity: 0,
              rotate: i % 2 === 0 ? -2.2 : 2.2,
              duration: 1,
              ease: "power3.out",
              scrollTrigger: { trigger: card, start: "top 85%" },
            });
            const poster = card.querySelector(".poster-frame");
            if (poster) {
              gsap.to(poster, {
                y: -22,
                ease: "none",
                scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: true },
              });
            }
          });

          gsap.from("footer .fmark, footer .fsub", {
            y: 16,
            opacity: 0,
            duration: 0.7,
            stagger: 0.1,
            scrollTrigger: { trigger: "footer", start: "top 90%" },
          });
        } else {
          gsap.set(".reel-card, footer .fmark, footer .fsub", { opacity: 1, y: 0 });
        }
      });
    }

    run();

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [reduced]);
}
