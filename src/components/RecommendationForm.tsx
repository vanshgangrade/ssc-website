"use client";

import { useEffect, useRef, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { submitRecommendation } from "@/app/actions";
import "./rec.css";

type SessionSummary = {
  email: string;
  name: string | null;
  image: string | null;
  isAdmin: boolean;
} | null;

/* ---------- floating particle effect ---------- */
function useParticles(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const particles: { x: number; y: number; r: number; vx: number; vy: number; a: number }[] = [];
    const count = 30;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2 + 0.5,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -(Math.random() * 0.3 + 0.08),
        a: Math.random() * 0.12 + 0.04,
      });
    }

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      for (const p of particles) {
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(180,140,80,${p.a})`;
        ctx!.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) {
          p.y = canvas!.height + 10;
          p.x = Math.random() * canvas!.width;
        }
        if (p.x < -10 || p.x > canvas!.width + 10) {
          p.x = Math.random() * canvas!.width;
        }
      }
      animId = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [canvasRef]);
}

export default function RecommendationForm({
  session,
}: {
  session: SessionSummary;
}) {
  const [movieName, setMovieName] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useParticles(canvasRef);

  /* auto-clear success message */
  useEffect(() => {
    if (message?.type === "success") {
      const t = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [message]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) {
      signIn("google");
      return;
    }
    if (!movieName.trim() || pending) return;

    setPending(true);
    setMessage(null);
    try {
      const res = await submitRecommendation(movieName.trim());
      if (res?.error) {
        setMessage({ type: "error", text: res.error });
      } else {
        setMessage({ type: "success", text: "Your pick has been submitted!" });
        setMovieName("");
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 600);
      }
    } catch {
      setMessage({ type: "error", text: "Failed to submit. Try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {/* background particles */}
      <canvas ref={canvasRef} className="particle-canvas" />

      <div className="rec-page">
        {/* decorative top strip */}
        <div className="rec-strip" />

        <header className="rec-hero">
          <div className="rec-hero-inner">

            <p className="eyebrow">
              <span className="eyebrow-dash" />
              Silver Screen Club
              <span className="eyebrow-dash" />
            </p>

            <h1 className="rec-title">
              What are we
              <em>watching this time?</em>
            </h1>

            <div className="rec-divider">
              <span /><span className="rec-diamond">◆</span><span />
            </div>

            <p className="rec-aside">
              Yes, we&apos;re asking you again. No, we won&apos;t just pick for you.
            </p>

            <p className="rec-whisper">
              Got a title stuck in your head? Whisper it to the group chat
              before the projector gets impatient and starts playing static.
            </p>

            {/* auth area */}
            {session ? (
              <div className="auth-chip">
                {session.image && (
                  <img
                    src={session.image}
                    alt=""
                    referrerPolicy="no-referrer"
                    width={28}
                    height={28}
                  />
                )}
                <span className="auth-email">{session.email}</span>
                <button className="auth-signout" onClick={() => signOut()}>
                  sign out
                </button>
              </div>
            ) : (
              <button className="ticket-btn" onClick={() => signIn("google")}>
                Sign in with Google
                <span className="ticket-arrow">→</span>
              </button>
            )}
          </div>
        </header>

        {/* recommendation form */}
        {session && (
          <section className="rec-form-section">
            <div className="rec-form-card">
              <div className="reel-no">
                <span>🎬 Freeze Frame On This</span>
              </div>

              <form onSubmit={handleSubmit} className="rec-form">
                <div className="input-wrap">
                  <input
                    ref={inputRef}
                    type="text"
                    value={movieName}
                    onChange={(e) => setMovieName(e.target.value)}
                    placeholder="Type a movie name..."
                    disabled={pending}
                    autoComplete="off"
                    maxLength={200}
                    className="rec-input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={pending || !movieName.trim()}
                  className={`submit-btn ${submitted ? "submitted" : ""}`}
                >
                  {pending ? (
                    <span className="spinner" />
                  ) : submitted ? (
                    "✓ Submitted!"
                  ) : (
                    "Submit Recommendation"
                  )}
                </button>
              </form>

              {message && (
                <p className={`rec-message ${message.type}`}>
                  {message.type === "success" ? "🎬 " : "⚠ "}
                  {message.text}
                </p>
              )}
            </div>
          </section>
        )}

        {/* footer */}
        <footer className="rec-footer">
          <p className="fmark">SILVER SCREEN CLUB</p>
          <p className="fsub">Every frame tells a story</p>
          <p className="fadmin">
            <a href="/inductions">Join the crew — inductions</a>
          </p>
          {session?.isAdmin && (
            <p className="fadmin">
              <a href="/admin">Admin Panel →</a>
            </p>
          )}
        </footer>
      </div>
    </>
  );
}
