import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { ensureProfile, getViewer, unreadCount } from "@/lib/films";
import { getDiaryBase } from "@/lib/diaryServer";
import { MAIN_ORIGIN } from "@/lib/diaryHost";
import DiaryNav from "@/components/films/DiaryNav";
import "@/components/ballot.css";
import "@/components/films/films.css";

export const metadata: Metadata = {
  title: { default: "SSC Film Diary", template: "%s — SSC Film Diary" },
  description: "Rate and review the films Silver Screen Club screens at BITS Pilani, Goa.",
};

export default async function DiaryLayout({ children }: { children: React.ReactNode }) {
  const [session, base] = await Promise.all([auth(), getDiaryBase()]);
  const viewer = await getViewer(session?.user);
  const [me, unread] = viewer ? await Promise.all([ensureProfile(viewer.userId), unreadCount(viewer.userId)]) : [null, 0];

  return (
    <div className="ssc diary">
      <DiaryNav
        base={base}
        me={me && session?.user ? { handle: me.handle, image: session.user.image ?? null, unread, isMod: viewer?.isMod ?? false } : null}
      />
      {children}
      <footer className="b-foot">
        <div className="s-wrap">
          <p className="billing">
            Silver Screen Club <small>presents</small> The Film Diary <small>written by</small> The Whole Campus
          </p>
          <a className="btn ghost" href={MAIN_ORIGIN}>
            Silver Screen Club ↗
          </a>
        </div>
      </footer>
    </div>
  );
}
