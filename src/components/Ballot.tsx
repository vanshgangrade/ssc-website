"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { signIn, signOut } from "next-auth/react";
import type { MovieDTO } from "@/lib/movies";
import "./ballot.css";

type SessionSummary = {
  email: string;
  name: string | null;
  image: string | null;
  isAdmin: boolean;
} | null;

type Results = { total: number; counts: Record<string, number>; at: number };

// Fallback accent per ballot slot, used until (or if) a colour can be read off the poster.
const PALETTE = ["#e2552a", "#3d7be0", "#e2c07a", "#3fb68b", "#b24fd1", "#e04a8a"];
const SEATS = 120;
const COLS = 24;
const ROWS = 5;

type Css = CSSProperties & Record<`--${string}`, string | number>;

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
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [voteNo, setVoteNo] = useState<number | null>(null);
  const [chartSeen, setChartSeen] = useState(false);
  const ballotRef = useRef<HTMLElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);
  const countdown = useCountdown(closesAt);
  const closed = !pollOpen || countdown?.expired === true;
  const colors = usePosterColors(movies);
  const films = useMemo(
    () => movies.map((m, i) => ({ ...m, ...parseTagline(m.tagline), color: colors[m.id] ?? PALETTE[i % PALETTE.length] })),
    [movies, colors],
  );

  // Winner(s) come from the same live counts as the standings; a tie shows every leader.
  const total = results?.total ?? 0;
  const topCount = results ? Math.max(0, ...films.map((m) => results.counts[m.id] ?? 0)) : 0;
  const winners = closed && results && topCount > 0 ? films.filter((m) => (results.counts[m.id] ?? 0) === topCount) : [];
  const mine = films.find((m) => m.id === myVote) ?? null;

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

  const refreshResults = useCallback(async (): Promise<Results | null> => {
    try {
      const res = await fetch("/api/results", { cache: "no-store" });
      if (!res.ok) return null;
      const data = await res.json();
      const next = { total: data.total, counts: data.counts, at: Date.now() };
      setResults(next);
      return next;
    } catch {
      return null; // keep showing the last good numbers
    }
  }, []);

  useEffect(() => {
    const tick = () => {
      if (!document.hidden) void refreshResults();
    };
    tick();
    const timer = setInterval(tick, 2000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refreshResults]);

  async function castVote(movieId: string) {
    if (!session) {
      signIn("google");
      return;
    }
    if (myVote === movieId) {
      setTicketOpen(true);
      return;
    }
    if (pending) return;

    setError(null);
    setPending(movieId);
    const prevVote = myVote;
    setMyVote(movieId);

    try {
      // Hold the "saving" state briefly so a fast response is still noticeable.
      const minDelay = new Promise((resolve) => setTimeout(resolve, 700));
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Vote failed");
      }
      const fresh = await refreshResults();
      await minDelay;
      setVoteNo(fresh?.total ?? null);
      setTicketOpen(true);
    } catch (err) {
      setMyVote(prevVote);
      setError(err instanceof Error ? err.message : "Could not save your vote. Try again.");
    } finally {
      setPending(null);
    }
  }

  // Ticket: close on Escape, focus the main action when it opens.
  useEffect(() => {
    if (!ticketOpen) return;
    doneRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTicketOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [ticketOpen]);

  // Reveal-on-scroll, plus the one-time wave that fills the seating chart.
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".ssc .rv"));
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("in");
          io.unobserve(e.target);
          if (e.target === chartRef.current) setChartSeen(true);
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [films.length]);

  function scrollToBallot() {
    ballotRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ----- the screen -----
  let screen: { film: (typeof films)[number] | null; kicker: string; title: string; subs: string };
  if (films.length === 0) {
    screen = { film: null, kicker: "Intermission", title: "Ballot coming soon", subs: "[no films on the ballot yet]" };
  } else if (closed && winners.length === 1) {
    screen = { film: winners[0], kicker: "The campus has picked", title: winners[0].name, subs: `— ${fmt(topCount)} of ${fmt(total)} votes.` };
  } else if (closed && winners.length > 1) {
    screen = { film: null, kicker: "It's a tie", title: winners.map((w) => w.name).join(" / "), subs: `— ${fmt(topCount)} votes each.` };
  } else if (closed) {
    screen = { film: null, kicker: "Intermission", title: "Voting closed", subs: "[the next ballot goes up soon]" };
  } else if (mine) {
    screen = { film: mine, kicker: "Your pick", title: mine.name, subs: "— You can switch until the ballot closes." };
  } else {
    screen = { film: null, kicker: "Now voting", title: "What plays next?", subs: session ? "[the hall is waiting on you]" : "[sign in to cast your vote]" };
  }

  // ----- the seating chart: 120 seats split by largest remainder -----
  const split = chartSeen ? seatsPerFilm(films.map((m) => results?.counts[m.id] ?? 0)) : films.map(() => 0);
  const seats: { color: string | null; you: boolean }[] = [];
  films.forEach((m, i) => {
    for (let j = 0; j < split[i]; j++) seats.push({ color: m.color, you: myVote === m.id && j === split[i] - 1 });
  });
  while (seats.length < SEATS) seats.push({ color: null, you: false });

  const voterName = session ? session.name || session.email.split("@")[0] : "";

  return (
    <div className="ssc">
      <header className="nav">
        <div className="s-wrap">
          <a className="brand" href="/club" aria-label="About Silver Screen Club">
            SSC
          </a>
          {session ? (
            <>
              <span className="who">
                {session.image && (
                  // eslint-disable-next-line @next/next/no-img-element -- Google avatar needs no-referrer, which next/image can't set
                  <img src={session.image} alt="" referrerPolicy="no-referrer" width={22} height={22} />
                )}
                <span>{session.name || session.email}</span>
              </span>
              <button className="btn ghost" type="button" onClick={() => signOut()}>
                Sign out
              </button>
            </>
          ) : (
            <button className="btn ghost" type="button" onClick={() => signIn("google")}>
              Sign in with Google
            </button>
          )}
        </div>
      </header>

      <main>
        <div className="hall">
          <div className="s-wrap">
            <div className="b-title">
              <p className="k">
                Silver Screen Club <span>presents</span>
              </p>
              <h1>The Ballot</h1>
              <p className="k">
                <span>{films.length === 1 ? "one film" : `${numberWord(films.length)} films`}</span> one vote <span>one screen</span>
              </p>
              <p className="status">
                <span className={closed ? "sign off" : "sign"}>
                  <i />
                  <span>{closed ? "Voting closed" : "Voting open"}</span>
                </span>
                <span className="closes">
                  {countdown && !countdown.expired && !closed && (
                    <>
                      Closes in <b>{countdown.text}</b>
                    </>
                  )}
                </span>
              </p>
            </div>

            <div className="screen" style={{ "--glow": screen.film?.color ?? "#8d7f6a" } as Css} aria-live="polite">
              <div className="layer slide" style={screen.film ? ({ "--c1": screen.film.color } as Css) : undefined}>
                <div className={screen.film ? "feature" : "feature solo"}>
                  {screen.film && <Poster src={screen.film.posterUrl} alt="" />}
                  <div>
                    <p className="sk">{screen.kicker}</p>
                    <p className="st">{screen.title}</p>
                  </div>
                </div>
                <p className="subs">{screen.subs}</p>
              </div>
              <div className="layer grain" />
            </div>
          </div>
          <div className="seatrow" aria-hidden="true" />
          <div className="floor" />
        </div>

        <section id="ballot" ref={ballotRef}>
          <div className="s-wrap">
            <span className="sign off">
              <span>The ballot</span>
            </span>
            <h2>
              {films.length === 1 ? "One film." : `${capital(numberWord(films.length))} films.`} <span className="hl">One vote.</span>
            </h2>
            <p className="lead">Pick the one you want on the big screen. You can switch your vote any time before the ballot closes.</p>

            <ol className="cases rv">
              {films.map((m, i) => {
                const isMine = myVote === m.id;
                const won = winners.length > 0 && winners.some((w) => w.id === m.id);
                const dim = (!closed && myVote !== null && !isMine) || (closed && winners.length > 0 && !won);
                const label = closed
                  ? won
                    ? "Winner"
                    : "Voting closed"
                  : pending === m.id
                    ? "Saving your vote…"
                    : isMine
                      ? "Your vote ✓  View ticket"
                      : !session
                        ? "Sign in to vote"
                        : myVote
                          ? "Switch to this"
                          : "Vote for this";
                return (
                  <li
                    key={m.id}
                    className={["case", isMine && !closed ? "mine" : "", won ? "won" : "", dim ? "dim" : ""].join(" ").trim()}
                    style={{ "--c1": m.color } as Css}
                  >
                    <div className="glass" onPointerMove={tilt} onPointerLeave={untilt}>
                      <span className="tag">{won ? (winners.length > 1 ? "Tied" : "Campus pick") : "Your pick"}</span>
                      <Poster src={m.posterUrl} alt={`${m.name} poster`} />
                    </div>
                    <div className="info">
                      <p className="no">Film {String(i + 1).padStart(2, "0")}</p>
                      <h3>{m.name}</h3>
                      <p className="m">
                        {m.meta}
                        {m.imdb && <> · IMDb {m.imdb}</>}
                      </p>
                      {m.note && <p className="cc">[{m.note}]</p>}
                      {m.blurb && <p className="d">{m.blurb}</p>}
                      <button
                        className="btn solid"
                        type="button"
                        aria-pressed={isMine}
                        disabled={(closed || (pending !== null && pending !== m.id)) && !(isMine && !closed)}
                        onClick={() => castVote(m.id)}
                      >
                        {label}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
            {films.length === 0 && <p className="hint">No films on the ballot yet. Check back soon.</p>}
            {error && (
              <p className="vote-err" role="alert">
                {error}
              </p>
            )}
            <p className="hint" aria-live="polite">
              {closed
                ? "This ballot is closed. The next films go up soon."
                : mine
                  ? `Your vote is in for ${mine.name}. Changed your mind? Pick another.`
                  : ""}
            </p>
          </div>
        </section>

        <section id="count">
          <div className="s-wrap">
            <span className={closed ? "sign off" : "sign"}>
              <i />
              <span>{closed ? "Final count" : "Live count"}</span>
            </span>
            <h2>
              Where the campus <span className="hl">is sitting</span>
            </h2>
            <p className="lead">Every vote takes a seat. The hall fills up in each film&apos;s colour as the votes come in.</p>

            {/* "in" is set here too: once chartSeen re-renders this element, React would otherwise drop the class the observer added. */}
            <div className={chartSeen ? "chart rv in" : "chart rv"} ref={chartRef}>
              <div className="house">
                <div className="mini-screen" />
                <p className="mini-label">Screen</p>
                <div className="seatmap" role="img" aria-label="Seating chart showing each film's share of the vote">
                  {seats.map((s, n) => {
                    const c = Math.floor(n / ROWS);
                    const r = n % ROWS;
                    const x = ((c + 0.5) / COLS) * 2 - 1;
                    return (
                      <span
                        key={n}
                        className={["seat", s.color ? "on" : "", s.you ? "you" : ""].join(" ").trim()}
                        style={
                          {
                            gridColumn: c < COLS / 2 ? c + 1 : c + 2,
                            gridRow: r + 1,
                            "--k": (1 - x * x).toFixed(3),
                            "--delay": `${c * 28}ms`,
                            ...(s.color ? { "--c": s.color } : {}),
                          } as Css
                        }
                      />
                    );
                  })}
                </div>
                <p className="per">
                  {total
                    ? `Each seat is about ${Math.max(1, Math.round(total / SEATS))} votes${mine ? ". The ringed seat is yours." : ""}`
                    : "No votes yet. Be the first."}
                </p>
              </div>
              <div>
                <ul className="tally">
                  {films.map((m) => {
                    const count = results?.counts[m.id] ?? 0;
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <li key={m.id} style={{ "--c": m.color } as Css}>
                        <div className="row">
                          <span className="dot" />
                          <span className="name">{m.name}</span>
                          <span className="pct">{Math.round(pct)}%</span>
                        </div>
                        <div className="bar">
                          <i style={{ width: `${pct}%` }} />
                        </div>
                        <p className="v">
                          {fmt(count)} {count === 1 ? "vote" : "votes"}
                          {myVote === m.id && " · including yours"}
                        </p>
                      </li>
                    );
                  })}
                </ul>
                <p className="total">
                  <b>{fmt(total)}</b> votes cast
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="b-foot">
        <div className="s-wrap">
          <p className="billing">
            Silver Screen Club <small>presents</small> The Ballot <small>starring</small> The Whole Campus <small>voting by</small> You{" "}
            <small>on location at</small> BITS Pilani, K K Birla Goa Campus
          </p>
          <a className="btn ghost" href="/club">
            About the club
          </a>
        </div>
      </footer>

      {mine && !closed && session && (
        <button className={ticketOpen ? "chip" : "chip show"} type="button" onClick={() => setTicketOpen(true)} style={{ "--c": mine.color } as Css}>
          <i />
          <span>Your vote: {mine.name}</span>
          <small>View ticket</small>
        </button>
      )}

      {mine && session && (
        <div
          className={ticketOpen ? "tk-wrap show" : "tk-wrap"}
          role="dialog"
          aria-modal="true"
          aria-label="Your ticket"
          aria-hidden={!ticketOpen}
          onClick={(e) => {
            if (e.target === e.currentTarget) setTicketOpen(false);
          }}
        >
          <p>Your vote is in. Here is your ticket.</p>
          <Ticket film={mine} name={voterName} email={session.email} voteNo={voteNo} />
          <div className="tk-actions">
            <button className="btn solid" type="button" ref={doneRef} onClick={() => setTicketOpen(false)} tabIndex={ticketOpen ? 0 : -1}>
              Done
            </button>
            <button
              className="btn ghost"
              type="button"
              tabIndex={ticketOpen ? 0 : -1}
              onClick={() => {
                setTicketOpen(false);
                scrollToBallot();
              }}
            >
              Change my vote
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Poster({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="poster">
      {/* eslint-disable-next-line @next/next/no-img-element -- posters can be admin-uploaded data: URIs, which next/image can't optimize */}
      <img src={src} alt={alt} loading="lazy" />
    </span>
  );
}

function Ticket({
  film,
  name,
  email,
  voteNo,
}: {
  film: { id: string; name: string; posterUrl: string; color: string };
  name: string;
  email: string;
  voteNo: number | null;
}) {
  const h = hash(`${email}|${film.id}`);
  return (
    <div className="tk" style={{ "--c": film.color } as Css}>
      <div className="tk-paper">
        <div className="tk-main">
          <Poster src={film.posterUrl} alt="" />
          <div>
            <div className="tk-top">
              <span>Silver Screen Club</span>
              <span>BITS Goa</span>
            </div>
            <div className="tk-film">{film.name}</div>
            <dl className="tk-fields">
              <div>
                <dt>Name</dt>
                <dd>{name}</dd>
              </div>
              <div>
                <dt>Venue</dt>
                <dd>The Auditorium</dd>
              </div>
              <div>
                <dt>Seat</dt>
                <dd>
                  Row {"ABCDEFGHJK".charAt(h % 10)} · {((h >>> 8) % 24) + 1}
                </dd>
              </div>
              <div>
                <dt>Time</dt>
                <dd>8:00 pm</dd>
              </div>
            </dl>
            <p className="tk-note">Valid only if this film wins the ballot. A souvenir of your vote, not an entry pass.</p>
          </div>
        </div>
        <div className="tk-stub">
          <span className="tk-admit">Admit one</span>
          {voteNo !== null && <span className="tk-no">Vote no. {fmt(voteNo)}</span>}
          <Barcode seed={`${email}|${film.name}`} />
          <span className="tk-code">SSC-{("000000" + h.toString(36).toUpperCase()).slice(-6)}</span>
        </div>
      </div>
    </div>
  );
}

// Decorative only: bars derived from the seed so each ticket looks different but stays stable.
function Barcode({ seed }: { seed: string }) {
  let h = hash(seed);
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  while (x < 190) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const w = 1 + (h % 3);
    if ((h >>> 8) % 4 !== 0) bars.push({ x, w });
    x += w + 1 + ((h >>> 12) % 2);
  }
  return (
    <svg className="tk-bars" viewBox="0 0 190 40" preserveAspectRatio="none" aria-hidden="true">
      {bars.map((b) => (
        <rect key={b.x} x={b.x} y={0} width={b.w} height={40} />
      ))}
    </svg>
  );
}

// Posters lean toward the pointer (mouse only; ignored for touch and reduced motion).
function tilt(e: ReactPointerEvent<HTMLDivElement>) {
  if (e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--ry", `${(((e.clientX - r.left) / r.width - 0.5) * 14).toFixed(1)}deg`);
  el.style.setProperty("--rx", `${((0.5 - (e.clientY - r.top) / r.height) * 10).toFixed(1)}deg`);
}
function untilt(e: ReactPointerEvent<HTMLDivElement>) {
  e.currentTarget.style.removeProperty("--rx");
  e.currentTarget.style.removeProperty("--ry");
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
  return h >>> 0;
}

function fmt(n: number): string {
  return n.toLocaleString("en-IN");
}

function numberWord(n: number): string {
  return ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"][n] ?? String(n);
}
function capital(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Taglines on the live ballot read like "[English subtitles will be available] Imdb: 8.2/10 A science teacher…".
// Pull the subtitle note and rating out so they can be shown on their own lines; anything else stays as the blurb.
function parseTagline(tagline: string): { note: string | null; imdb: string | null; blurb: string } {
  let rest = tagline.trim();
  let note: string | null = null;
  let imdb: string | null = null;
  const noteMatch = rest.match(/^\[([^\]]+)\]\s*/);
  if (noteMatch) {
    note = noteMatch[1].trim();
    rest = rest.slice(noteMatch[0].length);
  }
  const imdbMatch = rest.match(/imdb\s*:?\s*([\d.]+)\s*(?:\/\s*10)?/i);
  if (imdbMatch) {
    imdb = imdbMatch[1];
    rest = (rest.slice(0, imdbMatch.index) + rest.slice((imdbMatch.index ?? 0) + imdbMatch[0].length)).trim();
  }
  return { note, imdb, blurb: rest };
}

function seatsPerFilm(counts: number[]): number[] {
  const t = counts.reduce((a, b) => a + b, 0);
  if (!t) return counts.map(() => 0);
  const raw = counts.map((c) => (c / t) * SEATS);
  const out = raw.map(Math.floor);
  const left = SEATS - out.reduce((a, b) => a + b, 0);
  raw
    .map((v, i) => [v - out[i], i] as const)
    .sort((a, b) => b[0] - a[0])
    .slice(0, left)
    .forEach(([, i]) => out[i]++);
  return out;
}

// Reads a vivid accent colour off each poster so the glow matches the film.
function usePosterColors(movies: MovieDTO[]): Record<string, string> {
  const [colors, setColors] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    for (const m of movies) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (cancelled) return;
        const c = dominantColor(img);
        if (c) setColors((prev) => (prev[m.id] === c ? prev : { ...prev, [m.id]: c }));
      };
      img.src = m.posterUrl;
    }
    return () => {
      cancelled = true;
    };
  }, [movies]);
  return colors;
}

function dominantColor(img: HTMLImageElement): string | null {
  try {
    const w = 24;
    const h = 36;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    const px = ctx.getImageData(0, 0, w, h).data;
    let r = 0;
    let g = 0;
    let b = 0;
    let weight = 0;
    for (let i = 0; i < px.length; i += 4) {
      const max = Math.max(px[i], px[i + 1], px[i + 2]);
      const min = Math.min(px[i], px[i + 1], px[i + 2]);
      const wt = (max - min) / 255; // favour saturated pixels over greys
      r += px[i] * wt;
      g += px[i + 1] * wt;
      b += px[i + 2] * wt;
      weight += wt;
    }
    if (weight < 1) return null;
    const [hue, sat] = rgbToHsl(r / weight, g / weight, b / weight);
    return `hsl(${Math.round(hue)} ${Math.round(Math.max(sat, 0.62) * 100)}% 56%)`;
  } catch {
    return null; // a cross-origin poster taints the canvas; keep the palette colour
  }
}

function rgbToHsl(r: number, g: number, b: number): [number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (!d) return [0, 0];
  const l = (max + min) / 2;
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [(h * 60 + 360) % 360, Math.min(1, s)];
}

function useCountdown(closesAtIso: string | null): { text: string; expired: boolean } | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!closesAtIso) return;
    // Current time is only meaningful client-side, so this sync after mount is intentional.
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

function formatCountdown(msLeft: number): string {
  const totalSeconds = Math.max(0, Math.floor(msLeft / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const p = (n: number) => String(n).padStart(2, "0");
  const hms = `${p(Math.floor((totalSeconds % 86400) / 3600))}h ${p(Math.floor((totalSeconds % 3600) / 60))}m ${p(totalSeconds % 60)}s`;
  return days ? `${days}d ${hms}` : hms;
}
