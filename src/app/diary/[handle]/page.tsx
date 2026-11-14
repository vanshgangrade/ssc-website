import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProfilePage, getViewer } from "@/lib/films";
import { getDiaryBase } from "@/lib/diaryServer";
import { Histogram } from "@/components/films/FilmDiary";
import { Avatar, ReviewItem } from "@/components/films/ReviewItem";
import { Stars } from "@/components/films/Stars";
import FollowButton from "@/components/films/FollowButton";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const data = await getProfilePage(handle, null);
  if (!data) return { title: "Profile not found" };
  return { title: `${data.profile.name} (@${data.profile.handle})`, description: data.profile.bio || `${data.profile.name}'s film diary on SSC.` };
}

export default async function ProfilePage({ params }: Props) {
  const { handle } = await params;
  const [session, base] = await Promise.all([auth(), getDiaryBase()]);
  const viewer = await getViewer(session?.user);
  const data = await getProfilePage(decodeURIComponent(handle), viewer?.userId ?? null);
  if (!data) notFound();
  const { profile, stats, written, reviews, isMe } = data;
  const caps = { signedIn: !!viewer, isMod: viewer?.isMod ?? false };
  const joined = new Date(profile.joined).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <main className="s-wrap profile">
      <section className="phead">
        <Avatar name={profile.name} image={profile.image} size={96} />
        <div className="pcopy">
          <h1>{profile.name}</h1>
          <p className="phandle">
            @{profile.handle} · joined {joined}
          </p>
          <p className="pfollow">
            <b>{data.followers}</b> {data.followers === 1 ? "follower" : "followers"} · <b>{data.following}</b> following
          </p>
          {profile.bio && <p className="pbio">{profile.bio}</p>}
          {isMe ? (
            <Link className="btn ghost" href={`${base}/settings`}>
              Edit profile
            </Link>
          ) : (
            <FollowButton handle={profile.handle} initial={data.followedByMe} signedIn={!!viewer} />
          )}
        </div>
      </section>

      <section className="pstats card">
        <div>
          <b>{stats.count}</b>
          <span>{stats.count === 1 ? "film rated" : "films rated"}</span>
        </div>
        <div>
          <b>{written}</b>
          <span>{written === 1 ? "review" : "reviews"}</span>
        </div>
        <div>
          <b>{stats.average !== null ? stats.average.toFixed(1) : "–"}</b>
          <span className="pavg">
            average <Stars value={(stats.average ?? 0) * 2} size="0.9rem" />
          </span>
        </div>
        <div className="pdist">
          <Histogram stats={stats} />
        </div>
      </section>

      <section className="reviews">
        <h2>
          {isMe ? "Your" : "Their"} <span className="hl">diary</span>
        </h2>
        {reviews.length === 0 ? (
          <p className="empty">{isMe ? "Nothing logged yet. Rate a film and it shows up here." : "Nothing logged yet."}</p>
        ) : (
          <ol className="rlist">
            {reviews.map((r) => (
              <ReviewItem key={r.id} review={r} base={base} show="film" viewer={caps} />
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
