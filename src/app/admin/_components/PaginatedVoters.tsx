"use client";

import { useState } from "react";

type Vote = {
  userId: string;
  createdAt: string;
  updatedAt: string;
  user: { email: string; name: string | null };
  movie: { name: string };
};

export default function PaginatedVoters({ votes }: { votes: Vote[] }) {
  const [limit, setLimit] = useState(10);
  const displayed = votes.slice(0, limit);
  const hasMore = limit < votes.length;

  return (
    <div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Vote</th>
              <th>Cast at</th>
              <th>Last changed</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((v) => (
              <tr key={v.userId}>
                <td>{v.user.email}</td>
                <td>{v.user.name ?? "—"}</td>
                <td>{v.movie.name}</td>
                <td>{new Date(v.createdAt).toLocaleString()}</td>
                <td>{new Date(v.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
            {votes.length === 0 && (
              <tr>
                <td colSpan={5} className="admin-empty">
                  No votes cast yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <div style={{ marginTop: "16px", textAlign: "center" }}>
          <button className="admin-btn admin-btn-ghost" onClick={() => setLimit((l) => l + 20)}>
            Show more ({votes.length - limit} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
