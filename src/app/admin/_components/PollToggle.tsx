"use client";

import { useState, useTransition } from "react";

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PollToggle({
  pollId,
  initialOpen,
  initialClosesAt,
}: {
  pollId: string;
  initialOpen: boolean;
  initialClosesAt: string | null;
}) {
  const [pollOpen, setPollOpen] = useState(initialOpen);
  const [closesAt, setClosesAt] = useState(initialClosesAt);
  const [deadlineInput, setDeadlineInput] = useState(toLocalInputValue(initialClosesAt));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  function post(body: Record<string, unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/polls/${pollId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Request failed");
        const data = await res.json();
        setPollOpen(data.poll.isOpen);
        setClosesAt(data.poll.closesAt);
        setDeadlineInput(toLocalInputValue(data.poll.closesAt));
      } catch {
        setError("Could not update poll settings. Try again.");
      }
    });
  }

  function toggle() {
    post({ isOpen: !pollOpen });
  }

  function saveDeadline() {
    post({ closesAt: deadlineInput ? new Date(deadlineInput).toISOString() : null });
  }

  function clearDeadline() {
    setDeadlineInput("");
    post({ closesAt: null });
  }

  async function sendTestEmail() {
    setEmailStatus("Sending…");
    try {
      const res = await fetch("/api/admin/test-email", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      setEmailStatus(res.ok ? `Sent via ${data.provider} — check your inbox.` : `Failed: ${data.error ?? res.status}`);
    } catch {
      setEmailStatus("Failed: network error");
    }
  }

  return (
    <div className="poll-toggle-wrap">
      <div className="poll-toggle">
        <span className={`poll-status-pill ${pollOpen ? "open" : "closed"}`}>
          {pollOpen ? "Voting open" : "Voting closed"}
        </span>
        <button onClick={toggle} disabled={isPending} className="admin-btn">
          {isPending ? "Updating…" : pollOpen ? "Close voting" : "Reopen voting"}
        </button>
        {error && <span className="admin-error">{error}</span>}
      </div>

      <div className="poll-deadline">
        <label htmlFor="deadline">Voting deadline (shows a countdown on the site)</label>
        <div className="poll-deadline-row">
          <input
            id="deadline"
            type="datetime-local"
            value={deadlineInput}
            onChange={(e) => setDeadlineInput(e.target.value)}
          />
          <button className="admin-btn" onClick={saveDeadline} disabled={isPending}>
            Save
          </button>
          {closesAt && (
            <button className="admin-btn admin-btn-ghost" onClick={clearDeadline} disabled={isPending}>
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="poll-test-email">
        <button className="admin-btn admin-btn-ghost" onClick={sendTestEmail}>
          Send test email
        </button>
        {emailStatus && <span className="admin-email-status">{emailStatus}</span>}
      </div>
    </div>
  );
}
