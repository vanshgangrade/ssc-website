"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { submitRecommendation } from "@/app/actions";

type LeaderboardItem = {
  count: number;
  name: string;
  tmdbId: number | null;
  posterUrl: string | null;
  tagline: string | null;
  year: string | null;
};

export default function LeaderboardClient({
  items,
  session,
  userVotes,
}: {
  items: LeaderboardItem[];
  session: any;
  userVotes: string[];
}) {
  const [localItems, setLocalItems] = useState(items);
  const [myVotes, setMyVotes] = useState(new Set(userVotes));
  const [pending, setPending] = useState<string | null>(null);

  async function handleUpvote(item: LeaderboardItem) {
    if (!session) {
      signIn("google");
      return;
    }

    const key = item.tmdbId ? String(item.tmdbId) : item.name;
    if (myVotes.has(key) || pending) return;

    setPending(key);
    try {
      const res = await submitRecommendation(item.name, item.tmdbId);
      if (res?.error) {
        alert(res.error);
      } else {
        setMyVotes((prev) => new Set(prev).add(key));
        setLocalItems((prev) => 
          prev.map((i) => 
            (i.tmdbId === item.tmdbId && i.name === item.name) ? { ...i, count: i.count + 1 } : i
          ).sort((a, b) => b.count - a.count)
        );
      }
    } catch (err) {
      alert("Failed to upvote.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="leaderboard-list">
      {localItems.map((item, i) => {
        const key = item.tmdbId ? String(item.tmdbId) : item.name;
        const isVoted = myVotes.has(key);
        const isPending = pending === key;

        return (
          <div className="leaderboard-item" key={key}>
            <div className="rank">#{i + 1}</div>
            <div className="poster">
              {item.posterUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.posterUrl} alt={item.name} />
              ) : (
                <div className="poster-placeholder" />
              )}
            </div>
            <div className="details">
              <h2>
                {item.name} {item.year && <span className="year">({item.year})</span>}
              </h2>
              {item.tagline && <p className="tagline">{item.tagline}</p>}
              <p className="vote-count">{item.count} recommendation{item.count > 1 ? "s" : ""}</p>
            </div>
            <div className="actions">
              <button 
                className={`upvote-btn ${isVoted ? "voted" : ""}`}
                disabled={isVoted || isPending}
                onClick={() => handleUpvote(item)}
              >
                {isPending ? "..." : isVoted ? "✓ Upvoted" : "▲ Upvote"}
              </button>
            </div>
          </div>
        );
      })}
      {localItems.length === 0 && (
        <div className="empty-state">No recommendations yet. Be the first!</div>
      )}
    </div>
  );
}
