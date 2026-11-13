"use client";

import { signIn } from "next-auth/react";

export default function SignInPrompt({ text }: { text: string }) {
  return (
    <div className="card yours">
      <p className="yours-title">Sign in</p>
      <p className="muted">{text}</p>
      <button className="btn solid" type="button" onClick={() => signIn("google")}>
        Sign in with Google
      </button>
    </div>
  );
}
