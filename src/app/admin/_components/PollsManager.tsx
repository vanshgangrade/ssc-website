"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type PollSummary = {
  id: string;
  title: string;
  status: "DRAFT" | "LIVE" | "CLOSED" | "ARCHIVED";
  _count: { movies: number; votes: number };
};

const STATUS_LABEL: Record<PollSummary["status"], string> = {
  DRAFT: "Draft",
  LIVE: "Live",
  CLOSED: "Closed",
  ARCHIVED: "Archived",
};

export default function PollsManager({
  polls,
  selectedPollId,
}: {
  polls: PollSummary[];
  selectedPollId: string | null;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function select(id: string) {
    router.push(`/admin?poll=${id}`);
  }

  function createPoll(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/polls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not create poll");
        setTitle("");
        router.push(`/admin?poll=${data.poll.id}`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create poll");
      }
    });
  }

  function goLive(id: string) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/polls/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "LIVE" }),
        });
        if (!res.ok) throw new Error("Could not go live");
        router.refresh();
      } catch {
        setError("Could not make this poll live.");
      }
    });
  }

  function setStatus(id: string, status: PollSummary["status"]) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/polls/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error("Could not update poll");
        router.refresh();
      } catch {
        setError("Could not update poll status.");
      }
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this poll? Its movies and votes will be deleted too.")) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/polls/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Could not delete poll");
        if (id === selectedPollId) router.push("/admin");
        router.refresh();
      } catch {
        setError("Could not delete poll.");
      }
    });
  }

  return (
    <div className="polls-manager">
      <div className="polls-list">
        {polls.map((p) => (
          <div key={p.id} className={`poll-row ${p.id === selectedPollId ? "selected" : ""}`}>
            <button className="poll-row-main" onClick={() => select(p.id)}>
              <span className={`poll-status-pill ${p.status.toLowerCase()}`}>{STATUS_LABEL[p.status]}</span>
              <span className="poll-row-title">{p.title}</span>
              <span className="poll-row-meta">
                {p._count.movies} movie{p._count.movies === 1 ? "" : "s"} · {p._count.votes} vote
                {p._count.votes === 1 ? "" : "s"}
              </span>
            </button>
            <div className="poll-row-actions">
              {p.status !== "LIVE" && (
                <button className="admin-btn" disabled={isPending} onClick={() => goLive(p.id)}>
                  Go live
                </button>
              )}
              {p.status === "LIVE" && (
                <button className="admin-btn admin-btn-ghost" disabled={isPending} onClick={() => setStatus(p.id, "CLOSED")}>
                  Close
                </button>
              )}
              {p.status === "CLOSED" && (
                <button className="admin-btn admin-btn-ghost" disabled={isPending} onClick={() => setStatus(p.id, "ARCHIVED")}>
                  Archive
                </button>
              )}
              <button className="admin-btn admin-btn-danger" disabled={isPending} onClick={() => remove(p.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
        {polls.length === 0 && <p className="admin-empty">No polls yet, create one below.</p>}
      </div>

      <form className="poll-form" onSubmit={createPoll}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New poll title, e.g. September Week 1"
        />
        <button className="admin-btn" type="submit" disabled={isPending || !title.trim()}>
          {isPending ? "Working…" : "Create poll"}
        </button>
      </form>

      {error && <p className="admin-error">{error}</p>}
    </div>
  );
}
