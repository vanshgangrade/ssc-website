"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { updateEmailPrefs, updateProfile } from "@/app/diary/actions";
import { BIO_MAX_CHARS, NAME_MAX_CHARS } from "@/lib/filmRules";
import { DIARY_HOST } from "@/lib/diaryHost";

export default function ProfileSettings({
  base,
  initial,
  googleName,
  emailPrefs,
}: {
  base: string;
  initial: { handle: string; displayName: string; bio: string };
  googleName: string;
  emailPrefs: { emailLikes: boolean; emailReplies: boolean };
}) {
  const [emailLikes, setEmailLikes] = useState(emailPrefs.emailLikes);
  const [emailReplies, setEmailReplies] = useState(emailPrefs.emailReplies);
  const router = useRouter();
  const [handle, setHandle] = useState(initial.handle);
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [bio, setBio] = useState(initial.bio);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="card yours settings"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const [res] = await Promise.all([updateProfile({ handle, displayName, bio }), updateEmailPrefs({ emailLikes, emailReplies })]);
          if ("error" in res) {
            setError(res.error);
            return;
          }
          router.push(`${base}/${res.handle}`);
          router.refresh();
        });
      }}
    >
      <p className="yours-title">Your profile</p>

      <label className="sfield">
        <span>Username</span>
        <span className="prefix-input">
          <span aria-hidden="true">@</span>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
            maxLength={20}
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            required
            disabled={pending}
          />
        </span>
        <small>
          Your profile lives at {DIARY_HOST}/{handle || "…"}
        </small>
      </label>

      <label className="sfield">
        <span>Display name</span>
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={NAME_MAX_CHARS} placeholder={googleName || "Your name"} disabled={pending} />
        <small>Leave empty to use your Google name{googleName ? ` (${googleName})` : ""}.</small>
      </label>

      <label className="sfield">
        <span>Bio</span>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={BIO_MAX_CHARS} rows={3} placeholder="Favourite director, guilty-pleasure genre, hot takes…" disabled={pending} />
        <small>
          {bio.length} / {BIO_MAX_CHARS}
        </small>
      </label>

      <fieldset className="sfield prefs">
        <span>Email me when</span>
        <label className="check">
          <input type="checkbox" checked={emailReplies} onChange={(e) => setEmailReplies(e.target.checked)} disabled={pending} />
          <span>someone replies to my review</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={emailLikes} onChange={(e) => setEmailLikes(e.target.checked)} disabled={pending} />
          <span>someone likes my review (at most one email per review a day)</span>
        </label>
      </fieldset>

      {error && (
        <p className="err" role="alert">
          {error}
        </p>
      )}
      <div className="yours-actions">
        <button className="btn solid" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </button>
        <Link className="btn ghost" href={`${base}/${initial.handle}`}>
          Cancel
        </Link>
        <button className="btn ghost danger" type="button" onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    </form>
  );
}
