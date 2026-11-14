"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toggleFollow } from "@/app/diary/actions";

export default function FollowButton({ handle, initial, signedIn }: { handle: string; initial: boolean; signedIn: boolean }) {
  const router = useRouter();
  const [following, setFollowing] = useState(initial);
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      className={following ? "btn ghost" : "btn solid"}
      aria-pressed={following}
      disabled={pending}
      onClick={() => {
        if (!signedIn) {
          signIn("google");
          return;
        }
        const next = !following;
        setFollowing(next);
        start(async () => {
          const res = await toggleFollow(handle);
          if ("error" in res) setFollowing(!next);
          router.refresh();
        });
      }}
    >
      {following ? "Following ✓" : "Follow"}
    </button>
  );
}
