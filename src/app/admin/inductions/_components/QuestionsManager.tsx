"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  DEPARTMENTS,
  QUESTION_TYPE_LABELS,
  departmentName,
  type Question,
  type QuestionType,
} from "@/lib/inductions/questions";

type Draft = {
  prompt: string;
  hint: string;
  type: QuestionType;
  options: string;
  required: boolean;
  maxLength: string;
  onlyFor: string[];
};

function toDraft(q: Question): Draft {
  return {
    prompt: q.prompt,
    hint: q.hint ?? "",
    type: q.type,
    options: q.options.join("\n"),
    required: q.required,
    maxLength: q.maxLength ? String(q.maxLength) : "",
    onlyFor: q.onlyFor,
  };
}

function emptyDraft(): Draft {
  return {
    prompt: "",
    hint: "",
    type: "long",
    options: "",
    required: true,
    maxLength: "",
    onlyFor: [],
  };
}

/** Draft → the JSON body the API expects. */
function toPayload(d: Draft) {
  return {
    prompt: d.prompt.trim(),
    hint: d.hint.trim() || null,
    type: d.type,
    options:
      d.type === "choice" || d.type === "multi"
        ? d.options.split("\n").map((o) => o.trim()).filter(Boolean)
        : [],
    required: d.required,
    maxLength: d.maxLength.trim() ? Number(d.maxLength.trim()) : null,
    onlyFor: d.onlyFor,
  };
}

export default function QuestionsManager({
  cycleId,
  cycleTitle,
  questions,
  hasApplications,
}: {
  cycleId: string;
  cycleTitle: string;
  questions: Question[];
  hasApplications: boolean;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Something went wrong.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Network error — try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function startAdd() {
    setDraft(emptyDraft());
    setEditingId(null);
    setAdding(true);
    setError(null);
  }

  function startEdit(q: Question) {
    setDraft(toDraft(q));
    setEditingId(q.id);
    setAdding(false);
    setError(null);
  }

  function cancel() {
    setAdding(false);
    setEditingId(null);
    setError(null);
  }

  async function save() {
    const payload = toPayload(draft);
    const ok = editingId
      ? await call(`/api/admin/inductions/questions/${editingId}`, "PATCH", payload)
      : await call("/api/admin/inductions/questions", "POST", { cycleId, question: payload });
    if (ok) cancel();
  }

  async function remove(q: Question) {
    if (!confirm(`Delete this question?\n\n"${q.prompt}"`)) return;
    await call(`/api/admin/inductions/questions/${q.id}`, "DELETE");
  }

  async function move(index: number, by: -1 | 1) {
    const next = [...questions];
    const target = index + by;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    await call("/api/admin/inductions/questions", "PATCH", {
      cycleId,
      action: "reorder",
      orderedIds: next.map((q) => q.id),
    });
  }

  async function reset() {
    if (!confirm("Replace every question on this cycle with the built-in starter set?")) return;
    await call("/api/admin/inductions/questions", "PATCH", { cycleId, action: "reset" });
  }

  function toggleDept(id: string) {
    setDraft((d) => ({
      ...d,
      onlyFor: d.onlyFor.includes(id) ? d.onlyFor.filter((x) => x !== id) : [...d.onlyFor, id],
    }));
  }

  const needsOptions = draft.type === "choice" || draft.type === "multi";
  const editor = adding || editingId !== null;

  return (
    <section className="admin-card">
      <h2>
        Questions — {cycleTitle} <span className="ia-count">({questions.length})</span>
      </h2>
      <p className="admin-empty" style={{ textAlign: "left", padding: "0 0 14px" }}>
        These are the questions applicants see on /inductions. A question with no department
        attached is asked of everyone; otherwise only applicants who picked one of its departments
        see it.
        {hasApplications && " Applications have already come in — edits from here on won't change what past applicants were asked."}
      </p>

      <div className="iq-list">
        {questions.map((q, i) => (
          <div key={q.id} className="iq-row">
            <div className="iq-order">
              <button
                className="iq-move"
                onClick={() => move(i, -1)}
                disabled={busy || i === 0}
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                className="iq-move"
                onClick={() => move(i, 1)}
                disabled={busy || i === questions.length - 1}
                aria-label="Move down"
              >
                ↓
              </button>
            </div>

            <div className="iq-main">
              <p className="iq-prompt">{q.prompt}</p>
              <p className="iq-meta">
                {QUESTION_TYPE_LABELS[q.type]}
                {q.required ? " · required" : " · optional"}
                {q.maxLength ? ` · max ${q.maxLength} chars` : ""}
                {" · "}
                {q.onlyFor.length === 0 ? "everyone" : q.onlyFor.map(departmentName).join(", ")}
              </p>
              {q.options.length > 0 && <p className="iq-options">{q.options.join(" · ")}</p>}
            </div>

            <div className="iq-actions">
              <button className="admin-btn admin-btn-ghost" onClick={() => startEdit(q)} disabled={busy}>
                Edit
              </button>
              <button className="admin-btn admin-btn-danger" onClick={() => remove(q)} disabled={busy}>
                Delete
              </button>
            </div>
          </div>
        ))}
        {questions.length === 0 && (
          <p className="admin-empty">No questions yet — add one, or load the starter set.</p>
        )}
      </div>

      {!editor && (
        <div className="iq-toolbar">
          <button className="admin-btn" onClick={startAdd} disabled={busy}>
            Add question
          </button>
          <button
            className="admin-btn admin-btn-ghost"
            onClick={reset}
            disabled={busy || hasApplications}
            title={hasApplications ? "Applications already came in on these questions" : undefined}
          >
            Load starter set
          </button>
        </div>
      )}

      {editor && (
        <div className="iq-editor">
          <h3>{editingId ? "Edit question" : "New question"}</h3>

          <div className="ind-field">
            <label className="ind-label" htmlFor="iq-prompt">
              Question
            </label>
            <textarea
              id="iq-prompt"
              className="ia-input ia-textarea"
              rows={2}
              value={draft.prompt}
              onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
              maxLength={1000}
            />
          </div>

          <div className="ind-field">
            <label className="ind-label" htmlFor="iq-hint">
              Hint <span className="ind-opt">(optional, shown under the question)</span>
            </label>
            <input
              id="iq-hint"
              className="ia-input"
              value={draft.hint}
              onChange={(e) => setDraft({ ...draft, hint: e.target.value })}
              maxLength={500}
            />
          </div>

          <div className="iq-editor-row">
            <div className="ind-field">
              <label className="ind-label" htmlFor="iq-type">
                Answer type
              </label>
              <select
                id="iq-type"
                className="ia-input"
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as QuestionType })}
              >
                {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => (
                  <option key={t} value={t}>
                    {QUESTION_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            {!needsOptions && (
              <div className="ind-field">
                <label className="ind-label" htmlFor="iq-max">
                  Character limit <span className="ind-opt">(optional)</span>
                </label>
                <input
                  id="iq-max"
                  className="ia-input"
                  inputMode="numeric"
                  placeholder="1500"
                  value={draft.maxLength}
                  onChange={(e) => setDraft({ ...draft, maxLength: e.target.value.replace(/\D/g, "") })}
                />
              </div>
            )}
          </div>

          {needsOptions && (
            <div className="ind-field">
              <label className="ind-label" htmlFor="iq-options">
                Options — one per line
              </label>
              <textarea
                id="iq-options"
                className="ia-input ia-textarea"
                rows={5}
                value={draft.options}
                onChange={(e) => setDraft({ ...draft, options: e.target.value })}
              />
            </div>
          )}

          <div className="ind-field">
            <span className="ind-label">Ask this of</span>
            <p className="ind-hint">
              Leave all unticked to ask everyone. Tick departments to ask it only of applicants who
              picked one of them.
            </p>
            <div className="iq-depts">
              {DEPARTMENTS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className="ind-option"
                  data-selected={draft.onlyFor.includes(d.id)}
                  aria-pressed={draft.onlyFor.includes(d.id)}
                  onClick={() => toggleDept(d.id)}
                >
                  <span className="ind-tick ind-tick-box" aria-hidden="true" />
                  {d.name}
                </button>
              ))}
            </div>
          </div>

          <div className="ind-field">
            <button
              type="button"
              className="ind-option"
              data-selected={draft.required}
              aria-pressed={draft.required}
              onClick={() => setDraft({ ...draft, required: !draft.required })}
            >
              <span className="ind-tick ind-tick-box" aria-hidden="true" />
              Required — applicants can&apos;t continue without answering
            </button>
          </div>

          {error && <p className="admin-error">{error}</p>}

          <div className="iq-editor-actions">
            <button className="admin-btn admin-btn-ghost" onClick={cancel} disabled={busy}>
              Cancel
            </button>
            <button className="admin-btn" onClick={save} disabled={busy || !draft.prompt.trim()}>
              {busy ? "Saving…" : editingId ? "Save changes" : "Add question"}
            </button>
          </div>
        </div>
      )}

      {!editor && error && <p className="admin-error">{error}</p>}
    </section>
  );
}
