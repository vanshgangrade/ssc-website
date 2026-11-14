import { prisma } from "@/lib/prisma";

// Read side of the diary admin panel. Callers must check permissions first.

function nameOf(u: { name: string | null; profile: { handle: string; displayName: string | null } | null }) {
  return { name: u.profile?.displayName?.trim() || u.name?.trim() || "SSC member", handle: u.profile?.handle ?? null };
}

const who = { name: true, profile: { select: { handle: true, displayName: true } } } as const;

export type AdminReport = {
  id: string;
  reason: string;
  createdAt: string;
  reporter: { name: string; handle: string | null };
  kind: "review" | "comment";
  target: {
    id: string;
    text: string;
    rating: number | null;
    author: { name: string; handle: string | null };
    film: { slug: string; title: string };
    reviewId: string;
  };
  // How many open reports point at the same thing.
  sameTarget: number;
};

export async function listOpenReports(): Promise<AdminReport[]> {
  const rows = await prisma.report.findMany({
    where: { resolvedAt: null },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      reason: true,
      createdAt: true,
      reviewId: true,
      commentId: true,
      reporter: { select: who },
      review: { select: { id: true, body: true, rating: true, user: { select: who }, film: { select: { slug: true, title: true } } } },
      comment: {
        select: { id: true, body: true, reviewId: true, user: { select: who }, review: { select: { film: { select: { slug: true, title: true } } } } },
      },
    },
  });
  const counts = new Map<string, number>();
  for (const r of rows) {
    const key = r.reviewId ?? r.commentId ?? "";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const out: AdminReport[] = [];
  for (const r of rows) {
    if (r.review) {
      out.push({
        id: r.id,
        reason: r.reason,
        createdAt: r.createdAt.toISOString(),
        reporter: nameOf(r.reporter),
        kind: "review",
        target: { id: r.review.id, text: r.review.body, rating: r.review.rating, author: nameOf(r.review.user), film: r.review.film, reviewId: r.review.id },
        sameTarget: counts.get(r.review.id) ?? 1,
      });
    } else if (r.comment) {
      out.push({
        id: r.id,
        reason: r.reason,
        createdAt: r.createdAt.toISOString(),
        reporter: nameOf(r.reporter),
        kind: "comment",
        target: { id: r.comment.id, text: r.comment.body, rating: null, author: nameOf(r.comment.user), film: r.comment.review.film, reviewId: r.comment.reviewId },
        sameTarget: counts.get(r.comment.id) ?? 1,
      });
    }
  }
  return out;
}

export type AdminFilm = {
  slug: string;
  title: string;
  year: number | null;
  meta: string;
  posterUrl: string;
  reviewsOpen: boolean;
  checkInCode: string;
  reviews: number;
  checkins: number;
};

export async function listAdminFilms(): Promise<AdminFilm[]> {
  const films = await prisma.film.findMany({
    orderBy: [{ screenedOn: "desc" }, { createdAt: "desc" }],
    select: {
      slug: true,
      title: true,
      year: true,
      meta: true,
      posterUrl: true,
      reviewsOpen: true,
      checkInCode: true,
      _count: { select: { reviews: true, checkins: true } },
    },
  });
  return films.map((f) => ({
    slug: f.slug,
    title: f.title,
    year: f.year,
    meta: f.meta,
    posterUrl: f.posterUrl,
    reviewsOpen: f.reviewsOpen,
    checkInCode: f.checkInCode ?? "",
    reviews: f._count.reviews,
    checkins: f._count.checkins,
  }));
}

export type AdminModerator = { handle: string; name: string; email: string };

// Admin-only view, so emails are fine here; they're never shown on public pages.
export async function listModerators(): Promise<AdminModerator[]> {
  const rows = await prisma.profile.findMany({
    where: { role: "moderator" },
    orderBy: { handle: "asc" },
    select: { handle: true, displayName: true, user: { select: { name: true, email: true } } },
  });
  return rows.map((p) => ({ handle: p.handle, name: p.displayName?.trim() || p.user.name?.trim() || p.handle, email: p.user.email }));
}
