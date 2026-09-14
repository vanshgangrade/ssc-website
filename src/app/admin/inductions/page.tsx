import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { StoredAnswer } from "@/lib/inductions/validation";
import CycleManager from "./_components/CycleManager";
import ApplicationsBoard from "./_components/ApplicationsBoard";
import "../admin.css";
import "./inductions-admin.css";

export const dynamic = "force-dynamic";

export default async function AdminInductionsPage({
  searchParams,
}: {
  searchParams: Promise<{ cycle?: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin?callbackUrl=/admin/inductions");
  }
  if (!session.user.isAdmin) {
    return (
      <main className="admin-wrap">
        <div className="admin-card">
          <h1>Not authorized</h1>
          <p>{session.user.email} is not on the admin list.</p>
        </div>
      </main>
    );
  }

  const cycles = await prisma.inductionCycle.findMany({ orderBy: { createdAt: "desc" } });
  const { cycle: cycleParam } = await searchParams;
  const selected = cycles.find((c) => c.id === cycleParam) ?? cycles[0] ?? null;

  const applications = selected
    ? await prisma.application.findMany({
        where: { cycleId: selected.id },
        orderBy: { createdAt: "desc" },
        include: { user: { select: { email: true, name: true } } },
      })
    : [];

  return (
    <main className="admin-wrap">
      <div className="admin-header">
        <div>
          <p className="admin-eyebrow">Silver Screen Club</p>
          <h1>Admin — Crew Inductions</h1>
        </div>
        <div className="admin-header-actions">
          <a className="admin-btn admin-btn-ghost" href="/admin">
            Polls admin
          </a>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button className="admin-btn admin-btn-ghost" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>

      <CycleManager
        cycles={cycles.map((c) => ({
          id: c.id,
          title: c.title,
          isOpen: c.isOpen,
          closesAt: c.closesAt ? c.closesAt.toISOString() : null,
          createdAt: c.createdAt.toISOString(),
        }))}
        selectedCycleId={selected?.id ?? null}
      />

      {selected ? (
        <ApplicationsBoard
          cycleTitle={selected.title}
          applications={applications.map((a) => ({
            id: a.id,
            fullName: a.fullName,
            phone: a.phone,
            bitsEmail: a.bitsEmail,
            bitsId: a.bitsId,
            yearOfStudy: a.yearOfStudy,
            hostel: a.hostel,
            departments: a.departments,
            answers: (a.answers ?? []) as unknown as StoredAnswer[],
            status: a.status,
            reviewNote: a.reviewNote,
            reviewedBy: a.reviewedBy,
            reviewedAt: a.reviewedAt ? a.reviewedAt.toISOString() : null,
            createdAt: a.createdAt.toISOString(),
            accountEmail: a.user.email,
          }))}
        />
      ) : (
        <section className="admin-card">
          <h2>No induction cycle yet</h2>
          <p className="admin-empty">
            Create one above to open the form at /inductions.
          </p>
        </section>
      )}
    </main>
  );
}
