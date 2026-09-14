"use client";

import { useState } from "react";

type Recommendation = {
  id: string;
  movieName: string;
  createdAt: string;
  user: { email: string; name: string | null };
};

export default function ExportButton({ recommendations }: { recommendations: Recommendation[] }) {
  const [exporting, setExporting] = useState(false);

  function exportToCSV() {
    setExporting(true);
    try {
      const header = "Movie Name,Recommended By (Email),Recommended By (Name),Date\n";
      const rows = recommendations.map((r) => {
        const date = new Date(r.createdAt).toLocaleString();
        const name = r.user.name ?? "—";
        // Escape fields that might contain commas
        const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
        return `${escape(r.movieName)},${escape(r.user.email)},${escape(name)},${escape(date)}`;
      });
      const csv = header + rows.join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ssc-recommendations-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  function exportToGoogleSheets() {
    // Build TSV data for Google Sheets import
    const header = "Movie Name\tRecommended By (Email)\tRecommended By (Name)\tDate";
    const rows = recommendations.map((r) => {
      const date = new Date(r.createdAt).toLocaleString();
      const name = r.user.name ?? "—";
      return `${r.movieName}\t${r.user.email}\t${name}\t${date}`;
    });
    const tsv = header + "\n" + rows.join("\n");

    // Copy to clipboard then open Google Sheets
    navigator.clipboard.writeText(tsv).then(() => {
      alert("Data copied to clipboard! Google Sheets will open, create a new sheet and paste (Ctrl+V) the data.");
      window.open("https://sheets.google.com/create", "_blank");
    }).catch(() => {
      // Fallback: download as CSV if clipboard fails
      exportToCSV();
    });
  }

  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      <button className="admin-btn" onClick={exportToGoogleSheets} disabled={exporting || recommendations.length === 0}>
        📊 Export to Google Sheets
      </button>
      <button className="admin-btn admin-btn-ghost" onClick={exportToCSV} disabled={exporting || recommendations.length === 0}>
        📥 Download CSV
      </button>
    </div>
  );
}
