"use client";

import { useState } from "react";

export default function EmailTester() {
  const [to, setTo] = useState("");
  const [provider, setProvider] = useState<"resend" | "zeptomail">("resend");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleTest(e: React.FormEvent) {
    e.preventDefault();
    if (!to) return;
    setPending(true);
    setMsg("");
    
    try {
      const res = await fetch("/api/admin/test-email-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, provider }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg("Test email sent! Check logs below.");
      } else {
        setMsg("Error: " + (data.error || "Failed to send"));
      }
    } catch (err) {
      setMsg("Error submitting request");
    }
    setPending(false);
  }

  return (
    <form onSubmit={handleTest} style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "16px" }}>
      <input 
        type="email" 
        required 
        placeholder="Send test email to..." 
        value={to} 
        onChange={e => setTo(e.target.value)}
        style={{ padding: "8px 12px", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "white" }}
      />
      <select 
        value={provider} 
        onChange={e => setProvider(e.target.value as any)}
        style={{ padding: "8px 12px", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.2)", background: "var(--void)", color: "white" }}
      >
        <option value="resend">Resend</option>
        <option value="zeptomail">ZeptoMail</option>
        <option value="mailersend">MailerSend</option>
      </select>
      <button 
        type="submit" 
        disabled={pending}
        className="admin-btn admin-btn-ghost"
      >
        {pending ? "Sending..." : "Send Test"}
      </button>
      {msg && <span style={{ fontSize: "14px", color: msg.startsWith("Error") ? "var(--ember)" : "#4ade80" }}>{msg}</span>}
    </form>
  );
}
