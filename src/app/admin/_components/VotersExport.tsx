"use client";

type Vote = {
  userId: string;
  createdAt: string;
  updatedAt: string;
  user: { email: string; name: string | null };
  movie: { name: string };
};

const HEADERS = ["Name", "Email", "Voted for", "Cast at", "Last changed"];

// Quotes every field and defuses spreadsheet formulas (=, +, -, @) in user-supplied names.
function cell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

function toRows(votes: Vote[]): string[][] {
  return votes.map((v) => [
    v.user.name ?? "",
    v.user.email,
    v.movie.name,
    new Date(v.createdAt).toLocaleString(),
    new Date(v.updatedAt).toLocaleString(),
  ]);
}

export default function VotersExport({ votes, pollTitle }: { votes: Vote[]; pollTitle: string }) {
  const empty = votes.length === 0;

  function downloadCSV() {
    const lines = [HEADERS, ...toRows(votes)].map((r) => r.map(cell).join(","));
    // BOM so Excel reads UTF-8 names correctly
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const slug = pollTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "poll";
    link.href = url;
    link.download = `ssc-voters-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function copyForSheets() {
    const tsv = [HEADERS, ...toRows(votes)]
      .map((r) => r.map((c) => c.replace(/[\t\r\n]+/g, " ")).join("\t"))
      .join("\n");
    navigator.clipboard
      .writeText(tsv)
      .then(() => {
        alert("Voters copied! Google Sheets will open. Create a new sheet and paste (Ctrl+V).");
        window.open("https://sheets.google.com/create", "_blank");
      })
      .catch(downloadCSV);
  }

  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      <button className="admin-btn" onClick={copyForSheets} disabled={empty}>
        📊 Export to Google Sheets
      </button>
      <button className="admin-btn admin-btn-ghost" onClick={downloadCSV} disabled={empty}>
        📥 Download CSV
      </button>
    </div>
  );
}
