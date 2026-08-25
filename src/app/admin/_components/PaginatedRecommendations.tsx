"use client";

import { useState } from "react";

type Recommendation = {
  id: string;
  movieName: string;
  createdAt: string;
  user: { email: string; name: string | null };
};

export default function PaginatedRecommendations({ recommendations }: { recommendations: Recommendation[] }) {
  const [limit, setLimit] = useState(10);
  const displayed = recommendations.slice(0, limit);
  const hasMore = limit < recommendations.length;

  return (
    <div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Movie Name</th>
              <th>Recommended By (Email)</th>
              <th>Recommended By (Name)</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((r, i) => (
              <tr key={r.id}>
                <td>{i + 1}</td>
                <td><strong>{r.movieName}</strong></td>
                <td>{r.user.email}</td>
                <td>{r.user.name ?? "—"}</td>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {recommendations.length === 0 && (
              <tr>
                <td colSpan={5} className="admin-empty">
                  No recommendations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <div style={{ marginTop: "16px", textAlign: "center" }}>
          <button className="admin-btn admin-btn-ghost" onClick={() => setLimit((l) => l + 20)}>
            Show more ({recommendations.length - limit} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
