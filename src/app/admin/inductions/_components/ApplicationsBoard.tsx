"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { VERTICALS, verticalName } from "@/lib/inductions/questions";
import type { StoredAnswer } from "@/lib/inductions/validation";

export type AdminApplication = {
  id: string;
  fullName: string;
  phone: string;
  bitsEmail: string;
  bitsId: string;
  yearOfStudy: string;
  verticals: string[];
  answers: StoredAnswer[];
  status: string;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  accountEmail: string;
};

const STATUSES = ["SUBMITTED", "SHORTLISTED", "WAITLISTED", "REJECTED", "ACCEPTED"] as const;

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export default function ApplicationsBoard({
  cycleTitle,
  applications,
}: {
  cycleTitle: string;
  applications: AdminApplication[];
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [vertFilter, setVertFilter] = useState<string>("ALL");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const base: Record<string, number> = { ALL: applications.length };
    for (const s of STATUSES) base[s] = 0;
    for (const a of applications) base[a.status] = (base[a.status] ?? 0) + 1;
    return base;
  }, [applications]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return applications.filter((a) => {
      if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
      if (vertFilter !== "ALL" && !a.verticals.includes(vertFilter)) return false;
      if (!q) return true;
      return (
        a.fullName.toLowerCase().includes(q) ||
        a.bitsEmail.toLowerCase().includes(q) ||
        a.bitsId.toLowerCase().includes(q)
      );
    });
  }, [applications, statusFilter, vertFilter, query]);

  const open = applications.find((a) => a.id === openId) ?? null;

  function openApplication(a: AdminApplication) {
    setOpenId(a.id);
    setNote(a.reviewNote ?? "");
    setError(null);
  }

  async function review(status: string) {
    if (!open || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/inductions/applications/${open.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewNote: note.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Could not save that decision.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    // One column per question, so the sheet stays readable when a cycle mixes
    // verticals — union of every question id seen, in first-seen order.
    const questionIds: string[] = [];
    const prompts = new Map<string, string>();
    for (const a of applications) {
      for (const ans of a.answers) {
        if (!prompts.has(ans.id)) {
          prompts.set(ans.id, ans.prompt);
          questionIds.push(ans.id);
        }
      }
    }

    const header = [
      "Name",
      "BITS ID",
      "BITS Email",
      "Account Email",
      "Phone",
      "Year",
      "Verticals",
      "Status",
      "Review note",
      "Reviewed by",
      "Submitted",
      ...questionIds.map((id) => prompts.get(id) ?? id),
    ];

    const rows = visible.map((a) => {
      const byId = new Map(a.answers.map((ans) => [ans.id, ans]));
      const answerCells = questionIds.map((id) => {
        const ans = byId.get(id);
        if (!ans) return "";
        return Array.isArray(ans.answer) ? ans.answer.join("; ") : ans.answer;
      });
      return [
        a.fullName,
        a.bitsId,
        a.bitsEmail,
        a.accountEmail,
        a.phone,
        a.yearOfStudy,
        a.verticals.map(verticalName).join(" > "),
        a.status,
        a.reviewNote ?? "",
        a.reviewedBy ?? "",
        new Date(a.createdAt).toLocaleString(),
        ...answerCells,
      ];
    });

    const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ssc-inductions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <section className="admin-card">
        <h2>
          Applications — {cycleTitle} <span className="ia-count">({applications.length})</span>
        </h2>

        <div className="ia-filters">
          <div className="ia-chips">
            {(["ALL", ...STATUSES] as const).map((s) => (
              <button
                key={s}
                className="ia-chip"
                data-selected={statusFilter === s}
                onClick={() => setStatusFilter(s)}
              >
                {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                <span className="ia-chip-count">{counts[s] ?? 0}</span>
              </button>
            ))}
          </div>

          <div className="ia-filter-row">
            <select
              className="ia-input"
              value={vertFilter}
              onChange={(e) => setVertFilter(e.target.value)}
              aria-label="Filter by vertical"
            >
              <option value="ALL">All verticals</option>
              {VERTICALS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <input
              className="ia-input"
              placeholder="Search name, ID, email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="admin-btn admin-btn-ghost" onClick={exportCsv} disabled={visible.length === 0}>
              Download CSV ({visible.length})
            </button>
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>BITS ID</th>
                <th>Year</th>
                <th>Verticals</th>
                <th>Status</th>
                <th>Submitted</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((a) => (
                <tr key={a.id}>
                  <td>{a.fullName}</td>
                  <td className="ia-mono">{a.bitsId}</td>
                  <td>{a.yearOfStudy}</td>
                  <td>{a.verticals.map(verticalName).join(", ")}</td>
                  <td>
                    <span className={`ia-status ia-status-${a.status.toLowerCase()}`}>{a.status}</span>
                  </td>
                  <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button className="admin-btn admin-btn-ghost" onClick={() => openApplication(a)}>
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && <p className="admin-empty">Nothing matches those filters.</p>}
        </div>
      </section>

      {open && (
        <div className="ia-drawer-backdrop" onClick={() => setOpenId(null)}>
          <aside
            className="ia-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`Application from ${open.fullName}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ia-drawer-head">
              <div>
                <h3>{open.fullName}</h3>
                <p className="ia-drawer-sub">
                  {open.bitsId} · {open.yearOfStudy} · {open.verticals.map(verticalName).join(" → ")}
                </p>
              </div>
              <button className="admin-btn admin-btn-ghost" onClick={() => setOpenId(null)}>
                Close
              </button>
            </div>

            <dl className="ia-facts">
              <div>
                <dt>BITS email</dt>
                <dd>{open.bitsEmail}</dd>
              </div>
              <div>
                <dt>Signed in as</dt>
                <dd>{open.accountEmail}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{open.phone}</dd>
              </div>
              <div>
                <dt>Submitted</dt>
                <dd>{new Date(open.createdAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt>Reference</dt>
                <dd className="ia-mono">{open.id.slice(-8).toUpperCase()}</dd>
              </div>
            </dl>

            <div className="ia-answers">
              {open.answers.map((ans) => (
                <div key={ans.id} className="ia-answer">
                  <p className="ia-answer-q">{ans.prompt}</p>
                  <p className="ia-answer-a" data-empty={
                    (Array.isArray(ans.answer) ? ans.answer.length === 0 : ans.answer.trim() === "")
                      ? "true"
                      : undefined
                  }>
                    {Array.isArray(ans.answer)
                      ? ans.answer.join(", ") || "Left blank"
                      : ans.answer.trim() || "Left blank"}
                  </p>
                </div>
              ))}
            </div>

            <div className="ia-review">
              <label className="ia-review-label" htmlFor="ia-note">
                Review note (visible to admins only)
              </label>
              <textarea
                id="ia-note"
                className="ia-input ia-textarea"
                rows={3}
                value={note}
                maxLength={2000}
                onChange={(e) => setNote(e.target.value)}
              />
              {open.reviewedBy && (
                <p className="ia-reviewed">
                  Last set by {open.reviewedBy}
                  {open.reviewedAt ? ` on ${new Date(open.reviewedAt).toLocaleString()}` : ""}
                </p>
              )}

              <div className="ia-review-actions">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    className="admin-btn admin-btn-ghost"
                    data-current={open.status === s}
                    disabled={busy}
                    onClick={() => review(s)}
                  >
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
              {error && <p className="admin-error">{error}</p>}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
