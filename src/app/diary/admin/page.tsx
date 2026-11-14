import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getViewer } from "@/lib/films";
import { getDiaryBase } from "@/lib/diaryServer";
import { listAdminFilms, listModerators, listOpenReports } from "@/lib/diaryAdmin";
import { AdminFilms, AdminModerators, AdminReports } from "@/components/films/AdminPanels";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function DiaryAdminPage() {
  const [session, base] = await Promise.all([auth(), getDiaryBase()]);
  const viewer = await getViewer(session?.user);
  // To everyone else this page simply doesn't exist.
  if (!viewer?.isMod) notFound();

  const [reports, films, mods] = await Promise.all([
    listOpenReports(),
    viewer.isAdmin ? listAdminFilms() : Promise.resolve([]),
    viewer.isAdmin ? listModerators() : Promise.resolve([]),
  ]);

  return (
    <main className="s-wrap profile admin">
      <span className="sign off">
        <span>{viewer.isAdmin ? "Admin" : "Moderator"} panel</span>
      </span>
      <h2>
        Keep the diary <span className="hl">tidy</span>
      </h2>
      <p className="lead">Only you can see this page. Moderators look like any other member everywhere else on the site.</p>

      <AdminReports reports={reports} base={base} />
      {viewer.isAdmin && <AdminFilms films={films} base={base} />}
      {viewer.isAdmin && <AdminModerators mods={mods} />}
    </main>
  );
}
