"use client";

import Link from "next/link";
import { signIn, signOut } from "next-auth/react";
import { MAIN_ORIGIN } from "@/lib/diaryHost";

export default function DiaryNav({ base, me }: { base: string; me: { handle: string; image: string | null } | null }) {
  return (
    <header className="nav">
      <div className="s-wrap">
        <Link className="brand" href={base || "/"}>
          SSC <span className="brand-sub">Film Diary</span>
        </Link>
        <nav className="dnav" aria-label="Site">
          <a href={`${MAIN_ORIGIN}/vote`}>Vote</a>
        </nav>
        {me ? (
          <>
            <Link className="me" href={`${base}/${me.handle}`} aria-label="Your profile">
              {me.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- Google avatar needs no-referrer, which next/image can't set
                <img src={me.image} alt="" referrerPolicy="no-referrer" width={30} height={30} />
              ) : (
                <span className="avatar ph">{me.handle.charAt(0)}</span>
              )}
              <span className="me-handle">{me.handle}</span>
            </Link>
            <button className="btn ghost" type="button" onClick={() => signOut()}>
              Sign out
            </button>
          </>
        ) : (
          <button className="btn ghost" type="button" onClick={() => signIn("google")}>
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}
