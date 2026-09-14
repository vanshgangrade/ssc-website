"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEPARTMENTS,
  GENERAL_QUESTIONS,
  YEARS,
  departmentName,
  questionsForDepartments,
} from "@/lib/inductions/questions";
import { basicsSchema, validateAnswers } from "@/lib/inductions/validation";
import QuestionField from "./QuestionField";

type Value = string | string[];

type Draft = {
  fullName: string;
  phone: string;
  bitsEmail: string;
  bitsId: string;
  yearOfStudy: string;
  hostel: string;
  departments: string[];
  answers: Record<string, Value>;
};

const STEPS = ["Your details", "Department", "About you", "Review"] as const;

const DRAFT_KEY = "ssc-induction-draft-v1";

function emptyDraft(): Draft {
  return {
    fullName: "",
    phone: "",
    bitsEmail: "",
    bitsId: "",
    yearOfStudy: "",
    hostel: "",
    departments: [],
    answers: {},
  };
}

/**
 * Picks up a half-finished application. sessionStorage, not localStorage: the
 * draft should survive a refresh or a misclick, not sit around waiting for the
 * next person on a shared lab machine.
 *
 * Safe to call during the first render because this component is only ever
 * mounted on the client (see the dynamic import in InductionsClient) — there
 * is no server pass to disagree with.
 */
function loadDraft(signedInName: string | null): Draft {
  const base = emptyDraft();
  let draft = base;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (raw) draft = { ...base, ...JSON.parse(raw) };
  } catch {
    // Corrupt or blocked storage — just start clean.
  }
  // Save them typing a name we already know, unless they've typed their own.
  if (!draft.fullName && signedInName) draft = { ...draft, fullName: signedInName };
  return draft;
}

export default function ApplyFlow({
  signedInEmail,
  signedInName,
  onSubmitted,
}: {
  signedInEmail: string;
  signedInName: string | null;
  onSubmitted: () => void;
}) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => loadDraft(signedInName));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Storage full or blocked — the form still works, it just won't persist.
    }
  }, [draft]);

  const deptQuestions = useMemo(
    () => questionsForDepartments(draft.departments),
    [draft.departments]
  );

  const set = useCallback(<K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  }, []);

  const setAnswer = useCallback((id: string, value: Value) => {
    setDraft((d) => ({ ...d, answers: { ...d.answers, [id]: value } }));
  }, []);

  function goTo(nextStep: number) {
    setStep(nextStep);
    setErrors({});
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleDepartment(id: string) {
    const on = draft.departments.includes(id);
    if (!on && draft.departments.length >= 3) return;
    set("departments", on ? draft.departments.filter((d) => d !== id) : [...draft.departments, id]);
  }

  /** Validates the current step and moves on, or paints the errors. */
  function next() {
    if (step === 0) {
      const parsed = basicsSchema.safeParse({ ...draft, hostel: draft.hostel || undefined });
      if (!parsed.success) {
        const found: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0] ?? "form");
          if (!found[key]) found[key] = issue.message;
        }
        setErrors(found);
        return;
      }
      goTo(1);
      return;
    }

    // Steps 1 and 2 each validate only the questions shown on them; the full
    // bank is checked again at submit, and once more on the server.
    const onThisStep = step === 1 ? deptQuestions : GENERAL_QUESTIONS;
    const result = validateAnswers(draft.departments, draft.answers);
    if (!result.ok) {
      const onStep = Object.fromEntries(
        Object.entries(result.errors).filter(([id]) => onThisStep.some((q) => q.id === id))
      );
      if (Object.keys(onStep).length > 0) {
        setErrors(onStep);
        return;
      }
    }
    goTo(step + 1);
  }

  async function submit() {
    if (pending) return;
    setSubmitError(null);

    const parsedBasics = basicsSchema.safeParse({ ...draft, hostel: draft.hostel || undefined });
    if (!parsedBasics.success) {
      setSubmitError("Some of your details need fixing — go back to step 1.");
      return;
    }
    const checked = validateAnswers(draft.departments, draft.answers);
    if (!checked.ok) {
      setErrors(checked.errors);
      setSubmitError("Some required questions are still blank — check the earlier steps.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/inductions/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ basics: parsedBasics.data, answers: draft.answers }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(body?.error ?? "Could not submit your application. Try again.");
        return;
      }
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        // Nothing to clean up if storage is unavailable.
      }
      onSubmitted();
    } catch {
      setSubmitError("Network trouble — check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="ind-form-shell" ref={topRef}>
      <ol className="ind-steps" aria-label="Application progress">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className="ind-step"
            data-state={i === step ? "current" : i < step ? "done" : "todo"}
          >
            <span className="ind-step-no">{i < step ? "✓" : String(i + 1).padStart(2, "0")}</span>
            <span className="ind-step-label">{label}</span>
          </li>
        ))}
      </ol>

      <div className="ind-card">
        {step === 0 && (
          <section>
            <h3 className="ind-card-title">Roll call</h3>
            <p className="ind-card-sub">
              Signed in as <strong>{signedInEmail}</strong> — that&apos;s where we&apos;ll send
              updates about the rounds.
            </p>

            <div className="ind-field" data-error={errors.fullName ? "true" : undefined}>
              <label className="ind-label" htmlFor="fullName">
                Full name<span className="ind-req"> *</span>
              </label>
              <input
                id="fullName"
                className="ind-input"
                value={draft.fullName}
                onChange={(e) => set("fullName", e.target.value)}
                maxLength={120}
              />
              {errors.fullName && <p className="ind-error">{errors.fullName}</p>}
            </div>

            <div className="ind-row">
              <div className="ind-field" data-error={errors.bitsEmail ? "true" : undefined}>
                <label className="ind-label" htmlFor="bitsEmail">
                  BITS email<span className="ind-req"> *</span>
                </label>
                <input
                  id="bitsEmail"
                  className="ind-input"
                  inputMode="email"
                  placeholder="f20241234@goa.bits-pilani.ac.in"
                  value={draft.bitsEmail}
                  onChange={(e) => set("bitsEmail", e.target.value)}
                />
                {errors.bitsEmail && <p className="ind-error">{errors.bitsEmail}</p>}
              </div>

              <div className="ind-field" data-error={errors.bitsId ? "true" : undefined}>
                <label className="ind-label" htmlFor="bitsId">
                  BITS ID<span className="ind-req"> *</span>
                </label>
                <input
                  id="bitsId"
                  className="ind-input"
                  placeholder="2024A7PS0123G"
                  value={draft.bitsId}
                  onChange={(e) => set("bitsId", e.target.value)}
                />
                {errors.bitsId && <p className="ind-error">{errors.bitsId}</p>}
              </div>
            </div>

            <div className="ind-row">
              <div className="ind-field" data-error={errors.phone ? "true" : undefined}>
                <label className="ind-label" htmlFor="phone">
                  Phone<span className="ind-req"> *</span>
                </label>
                <input
                  id="phone"
                  className="ind-input"
                  inputMode="tel"
                  placeholder="98765 43210"
                  value={draft.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
                {errors.phone && <p className="ind-error">{errors.phone}</p>}
              </div>

              <div className="ind-field">
                <label className="ind-label" htmlFor="hostel">
                  Hostel / room<span className="ind-opt"> (optional)</span>
                </label>
                <input
                  id="hostel"
                  className="ind-input"
                  placeholder="AH-7 / 214"
                  value={draft.hostel}
                  onChange={(e) => set("hostel", e.target.value)}
                  maxLength={60}
                />
              </div>
            </div>

            <div className="ind-field" data-error={errors.yearOfStudy ? "true" : undefined}>
              <span className="ind-label">
                Year of study<span className="ind-req"> *</span>
              </span>
              <div className="ind-options ind-options-inline" role="radiogroup">
                {YEARS.map((y) => (
                  <button
                    key={y}
                    type="button"
                    role="radio"
                    aria-checked={draft.yearOfStudy === y}
                    className="ind-option"
                    data-selected={draft.yearOfStudy === y}
                    onClick={() => set("yearOfStudy", y)}
                  >
                    <span className="ind-tick" aria-hidden="true" />
                    {y}
                  </button>
                ))}
              </div>
              {errors.yearOfStudy && <p className="ind-error">{errors.yearOfStudy}</p>}
            </div>

            <div className="ind-field" data-error={errors.departments ? "true" : undefined}>
              <span className="ind-label">
                Which departments are you applying to?<span className="ind-req"> *</span>
              </span>
              <p className="ind-hint">Pick up to three — the order you tap them is your preference order.</p>
              <div className="ind-depts">
                {DEPARTMENTS.map((d) => {
                  const rank = draft.departments.indexOf(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      className="ind-dept"
                      data-selected={rank >= 0}
                      aria-pressed={rank >= 0}
                      onClick={() => toggleDepartment(d.id)}
                    >
                      <span className="ind-dept-rank">{rank >= 0 ? `#${rank + 1}` : "+"}</span>
                      <span className="ind-dept-name">{d.name}</span>
                      <span className="ind-dept-blurb">{d.blurb}</span>
                    </button>
                  );
                })}
              </div>
              {errors.departments && <p className="ind-error">{errors.departments}</p>}
            </div>
          </section>
        )}

        {step === 1 && (
          <section>
            <h3 className="ind-card-title">
              {draft.departments.length === 1 ? "Your department" : "Your departments"}
            </h3>
            <p className="ind-card-sub">
              {deptQuestions.length > 0
                ? "A few questions specific to what you picked."
                : "Nothing extra to ask for these picks — carry on."}
            </p>
            {deptQuestions.map((q) => (
              <QuestionField
                key={q.id}
                question={q}
                value={draft.answers[q.id]}
                error={errors[q.id]}
                onChange={(v) => setAnswer(q.id, v)}
              />
            ))}
          </section>
        )}

        {step === 2 && (
          <section>
            <h3 className="ind-card-title">About you</h3>
            <p className="ind-card-sub">The part we actually read twice.</p>
            {GENERAL_QUESTIONS.map((q) => (
              <QuestionField
                key={q.id}
                question={q}
                value={draft.answers[q.id]}
                error={errors[q.id]}
                onChange={(v) => setAnswer(q.id, v)}
              />
            ))}
          </section>
        )}

        {step === 3 && (
          <section>
            <h3 className="ind-card-title">Check the reel before it screens</h3>
            <p className="ind-card-sub">Once it&apos;s in, you can&apos;t edit it — so give it a read.</p>

            <dl className="ind-review">
              <div>
                <dt>Name</dt>
                <dd>{draft.fullName || "—"}</dd>
              </div>
              <div>
                <dt>BITS email</dt>
                <dd>{draft.bitsEmail || "—"}</dd>
              </div>
              <div>
                <dt>BITS ID</dt>
                <dd>{draft.bitsId || "—"}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{draft.phone || "—"}</dd>
              </div>
              <div>
                <dt>Year</dt>
                <dd>{draft.yearOfStudy || "—"}</dd>
              </div>
              {draft.hostel && (
                <div>
                  <dt>Hostel</dt>
                  <dd>{draft.hostel}</dd>
                </div>
              )}
              <div>
                <dt>Departments</dt>
                <dd>{draft.departments.map(departmentName).join(" → ") || "—"}</dd>
              </div>
            </dl>

            <div className="ind-review-answers">
              {[...deptQuestions, ...GENERAL_QUESTIONS].map((q) => {
                const v = draft.answers[q.id];
                const shown = Array.isArray(v) ? v.join(", ") : (v ?? "");
                return (
                  <div key={q.id} className="ind-review-answer">
                    <p className="ind-review-q">{q.prompt}</p>
                    <p className="ind-review-a" data-empty={shown.trim() === "" ? "true" : undefined}>
                      {shown.trim() === "" ? "Left blank" : shown}
                    </p>
                  </div>
                );
              })}
            </div>

            {submitError && <p className="ind-error ind-error-block">{submitError}</p>}
          </section>
        )}

        <div className="ind-actions">
          {step > 0 ? (
            <button type="button" className="ind-btn ind-btn-ghost" onClick={() => goTo(step - 1)}>
              ← Back
            </button>
          ) : (
            <span />
          )}

          {step < 3 ? (
            <button type="button" className="ind-btn" onClick={next}>
              Continue →
            </button>
          ) : (
            <button type="button" className="ind-btn" onClick={submit} disabled={pending}>
              {pending ? "Submitting…" : "Submit application"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
