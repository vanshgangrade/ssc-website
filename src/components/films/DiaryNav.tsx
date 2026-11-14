"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { MAIN_ORIGIN } from "@/lib/diaryHost";

export default function DiaryNav({ base, me }: { base: string; me: { handle: string; image: string | null; unread: number; isMod: boolean } | null }) {
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
          <AccountMenu base={base} me={me} />
        ) : (
          <button className="btn ghost" type="button" onClick={() => signIn("google")}>
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}

// Avatar button that opens a small menu: profile, edit profile, sign out.
function AccountMenu({ base, me }: { base: string; me: { handle: string; image: string | null; unread: number; isMod: boolean } }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="acct" ref={wrapRef}>
      <button className="me" type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {me.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- Google avatar needs no-referrer, which next/image can't set
          <img src={me.image} alt="" referrerPolicy="no-referrer" width={30} height={30} />
        ) : (
          <span className="avatar ph">{me.handle.charAt(0)}</span>
        )}
        <span className="me-handle">{me.handle}</span>
        {me.unread > 0 && (
          <span className="ndot" aria-label={`${me.unread} new notifications`}>
            {me.unread > 9 ? "9+" : me.unread}
          </span>
        )}
        <span className="caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="acct-menu" role="menu">
          <p className="acct-who">@{me.handle}</p>
          <Link role="menuitem" href={`${base}/${me.handle}`} onClick={() => setOpen(false)}>
            Your profile
          </Link>
          <Link role="menuitem" href={`${base}/notifications`} onClick={() => setOpen(false)}>
            Notifications{me.unread > 0 ? ` (${me.unread})` : ""}
          </Link>
          <Link role="menuitem" href={`${base}/settings`} onClick={() => setOpen(false)}>
            Edit profile
          </Link>
          {me.isMod && (
            <Link role="menuitem" href={`${base}/admin`} onClick={() => setOpen(false)}>
              Admin panel
            </Link>
          )}
          <button role="menuitem" type="button" className="acct-out" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
