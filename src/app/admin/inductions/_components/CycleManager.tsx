"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Cycle = {
  id: string;
  title: string;
  isOpen: boolean;
  closesAt: string | null;
  createdAt: string;
  applicationCount: number;
};

/** "2026-09-20T18:30" — what <input type="datetime-local"> expects, in local time. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export default function CycleManager({
  cycles,
  selectedCycleId,
}: {
  cycles: Cycle[];
  selectedCycleId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  // The cycle awaiting a typed-title confirmation before it is deleted.
  const [confirming, setConfirming] = useState<Cycle | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const selected = cycles.find((c) => c.id === selectedCycleId) ?? null;
  const [deadline, setDeadline] = useState(toLocalInput(selected?.closesAt ?? null));

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
        return null;
      }
      router.refresh();
      return data;
    } catch {
      setError("Network error, try again.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function createCycle() {
    if (!newTitle.trim()) return;
    const created = await call("/api/admin/inductions/cycles", "POST", { title: newTitle.trim() });
    if (created) setNewTitle("");
  }

  async function patchSelected(body: unknown) {
    if (!selected) return;
    await call(`/api/admin/inductions/cycles/${selected.id}`, "PATCH", body);
  }

  function startDelete(cycle: Cycle) {
    setError(null);
    // An empty cycle has nothing to lose, so one confirm is enough. A cycle
    // with applications on it has to have its title typed out.
    if (cycle.applicationCount === 0) {
      if (!confirm(`Delete "${cycle.title}"? It has no applications.`)) return;
      call(`/api/admin/inductions/cycles/${cycle.id}`, "DELETE");
      return;
    }
    setConfirming(cycle);
    setConfirmText("");
  }

  async function confirmDelete() {
    if (!confirming) return;
    const ok = await call(`/api/admin/inductions/cycles/${confirming.id}`, "DELETE", {
      confirmTitle: confirmText.trim(),
    });
    if (ok) {
      setConfirming(null);
      setConfirmText("");
    }
  }

  return (
    <section className="admin-card">
      <h2>Induction cycles</h2>
      <p className="admin-empty" style={{ textAlign: "left", padding: "0 0 14px" }}>
        The newest cycle is the one /inductions shows. Start next semester&apos;s drive by creating a
        new one, past applications stay where they are.
      </p>

      <div className="ia-cycle-list">
        {cycles.map((c) => (
          <div key={c.id} className="ia-cycle-row" data-selected={c.id === selectedCycleId}>
            <a className="ia-cycle-main" href={`/admin/inductions?cycle=${c.id}`}>
              <span className="ia-cycle-title">{c.title}</span>
              <span className="ia-cycle-meta">
                created {new Date(c.createdAt).toLocaleDateString()}
                {c.closesAt ? ` · closes ${new Date(c.closesAt).toLocaleString()}` : ""}
                {` · ${c.applicationCount} application${c.applicationCount === 1 ? "" : "s"}`}
              </span>
            </a>
            <span className={`poll-status-pill ${c.isOpen ? "open" : "closed"}`}>
              {c.isOpen ? "Open" : "Closed"}
            </span>
            <button
              className="admin-btn admin-btn-danger"
              onClick={() => startDelete(c)}
              disabled={busy}
            >
              Delete
            </button>
          </div>
        ))}
        {cycles.length === 0 && <p className="admin-empty">No cycles yet.</p>}
      </div>

      <div className="ia-cycle-new">
        <input
          className="ia-input"
          placeholder="Crew Inductions 2026"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          maxLength={120}
        />
        <button className="admin-btn" onClick={createCycle} disabled={busy || !newTitle.trim()}>
          Create cycle
        </button>
      </div>

      {selected && (
        <div className="ia-cycle-controls">
          <div className="poll-toggle-wrap">
            <button
              className="admin-btn"
              onClick={() => patchSelected({ isOpen: !selected.isOpen })}
              disabled={busy}
            >
              {selected.isOpen ? "Close applications" : "Open applications"}
            </button>
          </div>

          <div className="poll-deadline">
            <label htmlFor="ia-deadline">Deadline (optional)</label>
            <div className="poll-deadline-row">
              <input
                id="ia-deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
              <button
                className="admin-btn admin-btn-ghost"
                disabled={busy}
                onClick={() =>
                  patchSelected({ closesAt: deadline ? new Date(deadline).toISOString() : null })
                }
              >
                Save
              </button>
              <button
                className="admin-btn admin-btn-ghost"
                disabled={busy || !selected.closesAt}
                onClick={() => {
                  setDeadline("");
                  patchSelected({ closesAt: null });
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {confirming && (
        <div className="ia-confirm">
          <h3>Delete &ldquo;{confirming.title}&rdquo;?</h3>
          <p>
            This also deletes {confirming.applicationCount} application
            {confirming.applicationCount === 1 ? "" : "s"} and every question on this cycle. It
            cannot be undone.
          </p>
          <label className="ia-review-label" htmlFor="ia-confirm-title">
            Type the cycle title to confirm
          </label>
          <input
            id="ia-confirm-title"
            className="ia-input"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={confirming.title}
            autoComplete="off"
          />
          <div className="ia-confirm-actions">
            <button
              className="admin-btn admin-btn-ghost"
              onClick={() => {
                setConfirming(null);
                setConfirmText("");
              }}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              className="admin-btn admin-btn-danger"
              onClick={confirmDelete}
              disabled={busy || confirmText.trim() !== confirming.title}
            >
              Delete this cycle
            </button>
          </div>
        </div>
      )}

      {error && <p className="admin-error">{error}</p>}
    </section>
  );
}
