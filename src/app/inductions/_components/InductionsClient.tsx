"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { signIn, signOut } from "next-auth/react";
import { DEPARTMENTS, departmentName, type Question } from "@/lib/inductions/questions";

// Client-only: the form restores its draft from sessionStorage during its
// first render, which there is no sensible server equivalent of. Skipping the
// server pass avoids rendering an empty form and then swapping it out.
const ApplyFlow = dynamic(() => import("./ApplyFlow"), {
  ssr: false,
  loading: () => <p className="ind-loading">Loading your form…</p>,
});

type SessionSummary = {
  email: string;
  name: string | null;
  image: string | null;
  isAdmin: boolean;
} | null;

type Existing = {
  id: string;
  submittedAt: string;
  departments: string[];
  status: string;
} | null;

const PROCESS = [
  {
    no: "01",
    title: "Apply",
    body: "This form. Fifteen minutes if you write honestly, forty if you try to sound impressive.",
  },
  {
    no: "02",
    title: "Task round",
    body: "A small, department-specific brief you do in your own time. No prior experience assumed.",
  },
  {
    no: "03",
    title: "Interview",
    body: "A relaxed conversation about your task, the films you love, and what you want to make here.",
  },
  {
    no: "04",
    title: "Crew call",
    body: "Results over email. If you're in, you're on the next production from day one.",
  },
];

const FAQS = [
  {
    q: "Do I need any prior experience?",
    a: "No. Every cycle we induct people who have never touched a camera or a timeline. Curiosity and follow-through matter more than a showreel.",
  },
  {
    q: "Can I apply to more than one department?",
    a: "Up to three, ranked by preference. You'll answer the questions for each one you pick, so choose the ones you'd genuinely show up for.",
  },
  {
    q: "How much time does crew work take?",
    a: "Around three to six hours in a normal week, more in the run-up to a shoot or a screening. We plan around tests — just tell us early.",
  },
  {
    q: "Is this only for first-years?",
    a: "Not at all. Anyone on campus can apply, any year.",
  },
  {
    q: "Can I edit my application after submitting?",
    a: "No — so read it over on the review step. If something important changed, write to us and we'll sort it out.",
  },
];

function useCountdown(iso: string | null) {
  const [left, setLeft] = useState<string | null>(null);

  useEffect(() => {
    if (!iso) return;
    const target = new Date(iso).getTime();

    function tick() {
      const ms = target - Date.now();
      if (ms <= 0) {
        setLeft(null);
        return;
      }
      const days = Math.floor(ms / 86_400_000);
      const hours = Math.floor((ms % 86_400_000) / 3_600_000);
      const mins = Math.floor((ms % 3_600_000) / 60_000);
      setLeft(days > 0 ? `${days}d ${hours}h ${mins}m` : `${hours}h ${mins}m`);
    }

    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [iso]);

  return left;
}

export default function InductionsClient({
  session,
  cycleTitle,
  closesAt,
  isOpen,
  closedMessage,
  existing,
  questions,
}: {
  session: SessionSummary;
  cycleTitle: string;
  closesAt: string | null;
  isOpen: boolean;
  closedMessage: string;
  existing: Existing;
  questions: Question[];
}) {
  // Flips to true the moment the form posts successfully, so the thank-you
  // shows without a round trip. A refresh lands on the same state from the
  // server, which reads the row it just wrote.
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const countdown = useCountdown(closesAt);
  const done = justSubmitted || existing !== null;

  return (
    <>
      <div className="rail left" aria-hidden="true">
        <div className="rail-holes" />
      </div>
      <div className="rail right" aria-hidden="true">
        <div className="rail-holes" />
      </div>

      <main className="ind-page">
        <header className="ind-hero">
          <div className="wrap wrap-wide">
            <p className="eyebrow">Silver Screen Club · BITS Goa</p>
            <h1 className="ind-title">
              Crew
              <em>Inductions</em>
            </h1>
            <p className="ind-lede">
              We make films on this campus — shorts, documentaries, the odd chaotic sketch — and we
              screen them to a room that actually shows up. {cycleTitle} is how you get on the crew.
            </p>

            {isOpen && countdown && (
              <div className="countdown">
                <span className="countdown-label">Applications close in</span>
                <span className="countdown-value">{countdown}</span>
              </div>
            )}

            {!isOpen && <p className="ind-closed-banner">{closedMessage}</p>}

            {session ? (
              <div className="auth-chip">
                {session.image && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={session.image} alt="" referrerPolicy="no-referrer" width={22} height={22} />
                )}
                <span className="auth-email">{session.email}</span>
                <button className="auth-signout" onClick={() => signOut()}>
                  sign out
                </button>
              </div>
            ) : (
              isOpen && (
                <button className="ind-btn ind-btn-hero" onClick={() => signIn("google", { callbackUrl: "/inductions" })}>
                  Sign in to apply <span aria-hidden="true">→</span>
                </button>
              )
            )}
            {!session && isOpen && (
              <p className="ind-signin-note">
                Sign in with your BITS Google account — it&apos;s how we keep one application per person.
              </p>
            )}
          </div>
        </header>

        {/* ---- the form, or what stands in for it ---- */}
        <section className="ind-section" id="apply">
          <div className="wrap wrap-wide">
            {done ? (
              <div className="ind-card ind-done">
                <p className="eyebrow">That&apos;s a wrap</p>
                <h2 className="ind-done-title">Your application is in.</h2>
                <p className="ind-done-body">
                  We&apos;ve got it{existing ? "" : " — a confirmation is on its way to your inbox"}. Watch
                  your BITS email for the task round; everything after this happens there.
                </p>
                {existing && (
                  <dl className="ind-review">
                    <div>
                      <dt>Submitted</dt>
                      <dd>{new Date(existing.submittedAt).toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt>Departments</dt>
                      <dd>{existing.departments.map(departmentName).join(" → ")}</dd>
                    </div>
                    <div>
                      <dt>Reference</dt>
                      <dd className="ind-mono">{existing.id.slice(-8).toUpperCase()}</dd>
                    </div>
                  </dl>
                )}
              </div>
            ) : !isOpen ? (
              <div className="ind-card ind-done">
                <p className="eyebrow">Not right now</p>
                <h2 className="ind-done-title">The form is shut.</h2>
                <p className="ind-done-body">{closedMessage}</p>
              </div>
            ) : session ? (
              <ApplyFlow
                questions={questions}
                signedInEmail={session.email}
                signedInName={session.name}
                onSubmitted={() => setJustSubmitted(true)}
              />
            ) : (
              <div className="ind-card ind-done">
                <p className="eyebrow">One step first</p>
                <h2 className="ind-done-title">Sign in to start your application.</h2>
                <p className="ind-done-body">
                  Your draft saves as you go, so you can leave the tab and come back to it.
                </p>
                <button className="ind-btn" onClick={() => signIn("google", { callbackUrl: "/inductions" })}>
                  Sign in with Google
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ---- departments ---- */}
        <section className="ind-section">
          <div className="wrap wrap-wide">
            <div className="section-head">
              <p className="eyebrow">Where you&apos;d fit</p>
              <h2>Six departments, one crew</h2>
              <p>
                Nobody stays in their lane forever — but this is where you&apos;d start, and what
                we&apos;d train you on first.
              </p>
            </div>
            <div className="ind-dept-grid">
              {DEPARTMENTS.map((d, i) => (
                <article key={d.id} className="ind-dept-card">
                  <p className="reel-no">
                    <span>Dept {String(i + 1).padStart(2, "0")}</span>
                  </p>
                  <h3>{d.name}</h3>
                  <p>{d.blurb}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---- process ---- */}
        <section className="ind-section">
          <div className="wrap wrap-wide">
            <div className="section-head">
              <p className="eyebrow">How it runs</p>
              <h2>Four steps, no surprises</h2>
            </div>
            <ol className="ind-process">
              {PROCESS.map((s) => (
                <li key={s.no}>
                  <span className="ind-process-no">{s.no}</span>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---- faq ---- */}
        <section className="ind-section">
          <div className="wrap wrap-wide">
            <div className="section-head">
              <p className="eyebrow">Before you ask</p>
              <h2>Questions we get every year</h2>
            </div>
            <div className="ind-faq">
              {FAQS.map((f, i) => (
                <div key={f.q} className="ind-faq-item" data-open={openFaq === i}>
                  <button
                    type="button"
                    className="ind-faq-q"
                    aria-expanded={openFaq === i}
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    {f.q}
                    <span className="ind-faq-sign" aria-hidden="true">
                      {openFaq === i ? "−" : "+"}
                    </span>
                  </button>
                  {openFaq === i && <p className="ind-faq-a">{f.a}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer>
          <p className="fmark">SILVER SCREEN CLUB</p>
          <p className="fsub">Every frame tells a story</p>
          {session?.isAdmin && (
            <p className="fadmin">
              <a href="/admin/inductions">Admin — Applications →</a>
            </p>
          )}
        </footer>
      </main>
    </>
  );
}
