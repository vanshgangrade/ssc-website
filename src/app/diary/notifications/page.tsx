import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getNotifications } from "@/lib/films";
import { getDiaryBase } from "@/lib/diaryServer";
import { Avatar } from "@/components/films/ReviewItem";
import { formatDate } from "@/components/films/formatDate";
import SignInPrompt from "@/components/films/SignInPrompt";
import MarkRead from "@/components/films/MarkRead";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const [session, base] = await Promise.all([auth(), getDiaryBase()]);
  if (!session?.user?.id) {
    return (
      <main className="s-wrap profile">
        <SignInPrompt text="Sign in to see who liked and replied to your reviews." />
      </main>
    );
  }
  const items = await getNotifications(session.user.id);
  const unread = items.some((n) => n.unread);

  return (
    <main className="s-wrap profile">
      {unread && <MarkRead />}
      <h2>
        Your <span className="hl">notifications</span>
      </h2>
      {items.length === 0 ? (
        <p className="empty">Nothing yet. Likes, replies and new followers show up here.</p>
      ) : (
        <ol className="nlist">
          {items.map((n) => {
            const who = n.actor.handle ? (
              <Link href={`${base}/${n.actor.handle}`}>{n.actor.name}</Link>
            ) : (
              <b>{n.actor.name}</b>
            );
            const film = n.film ? <Link href={`${base}/film/${n.film.slug}`}>{n.film.title}</Link> : null;
            return (
              <li key={n.id} className={n.unread ? "card nrow unread" : "card nrow"}>
                <Avatar name={n.actor.name} image={n.actor.image} size={36} />
                <div>
                  <p>
                    {n.type === "like" && (
                      <>
                        {who} liked your review of {film}
                      </>
                    )}
                    {n.type === "comment" && (
                      <>
                        {who} replied to your review of {film}
                      </>
                    )}
                    {n.type === "follow" && <>{who} started following you</>}
                  </p>
                  {n.snippet && <p className="nsnip">“{n.snippet}”</p>}
                  <p className="rdate">{formatDate(n.createdAt)}</p>
                </div>
                <span className="nicon" aria-hidden="true">
                  {n.type === "like" ? "♥" : n.type === "comment" ? "💬" : "＋"}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
