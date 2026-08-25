"use client";

import { useState } from "react";

type EmailLog = {
  id: string;
  to: string;
  subject: string;
  provider: string;
  status: string;
  errorMsg: string | null;
  createdAt: string;
};

export default function PaginatedEmailLogs({ logs }: { logs: EmailLog[] }) {
  const [limit, setLimit] = useState(10);
  const displayed = logs.slice(0, limit);
  const hasMore = limit < logs.length;

  return (
    <div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>To</th>
              <th>Subject</th>
              <th>Provider</th>
              <th>Status</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((l) => (
              <tr key={l.id}>
                <td style={{ whiteSpace: "nowrap" }}>{new Date(l.createdAt).toLocaleString()}</td>
                <td>{l.to}</td>
                <td>{l.subject}</td>
                <td>
                  <span style={{ 
                    padding: "2px 6px", 
                    borderRadius: "4px", 
                    fontSize: "12px", 
                    background: l.provider === "resend" ? "rgba(255,255,255,0.1)" : l.provider === "zeptomail" ? "rgba(232, 179, 65, 0.2)" : l.provider === "mailersend" ? "rgba(59, 130, 246, 0.2)" : "rgba(192, 67, 44, 0.2)",
                    color: l.provider === "zeptomail" ? "var(--marquee)" : l.provider === "mailersend" ? "#60a5fa" : l.provider === "failed" ? "var(--ember)" : "white"
                  }}>
                    {l.provider}
                  </span>
                </td>
                <td>
                  <span style={{ color: l.status === "success" ? "#4ade80" : "var(--ember)" }}>
                    {l.status}
                  </span>
                </td>
                <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={l.errorMsg || ""}>
                  {l.errorMsg || "—"}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} className="admin-empty">
                  No emails sent yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <div style={{ marginTop: "16px", textAlign: "center" }}>
          <button className="admin-btn admin-btn-ghost" onClick={() => setLimit((l) => l + 20)}>
            Show more ({logs.length - limit} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
