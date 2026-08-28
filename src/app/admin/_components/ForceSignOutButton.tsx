"use client";

import { useState } from "react";

export default function ForceSignOutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function forceSignOutEveryone() {
    if (
      !confirm(
        "Sign out every signed-in user, including yourself? Everyone will need to sign in with Google again."
      )
    ) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/force-signout", { method: "POST" });
      if (!res.ok) throw new Error("Request failed");
      // This request just deleted the admin's own session row too, so the
      // reload below will bounce back through /signin like everyone else's.
      window.location.href = "/";
    } catch {
      setError("Could not force sign-out. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="force-signout">
      <button className="admin-btn admin-btn-danger" onClick={forceSignOutEveryone} disabled={busy}>
        {busy ? "Signing everyone out…" : "Force sign-out everyone"}
      </button>
      {error && <span className="admin-error">{error}</span>}
    </div>
  );
}
