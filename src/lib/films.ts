import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin";
import { RATING_MAX, RATING_MIN } from "@/lib/filmRules";

export type FilmSummary = {
  slug: string;
  title: string;
  year: number | null;
  meta: string;
  posterUrl: string;
  reviewsOpen: boolean;
};

export type FilmStats = {
  count: number;
  // Average in stars (0–5), one decimal; null when nobody has rated yet.
  average: number | null;
  // How many ratings landed on each half-star, index 0 = ½★ … 9 = ★★★★★.
  histogram: number[];
};

export type Author = { name: string; handle: string | null; image: string | null };

export type CommentDTO = {
  id: string;
  body: string;
  createdAt: string;
  author: Author;
  mine: boolean;
};

export type ReviewDTO = {
  id: string;
  rating: number;
  body: string;
  spoiler: boolean;
  createdAt: string;
  edited: boolean;
  author: Author;
  film: { slug: string; title: string; posterUrl: string };
  mine: boolean;
  likes: number;
  likedByMe: boolean;
  commentCount: number;
  // Only filled in on the film page; elsewhere reviews link there for the thread.
  comments: CommentDTO[] | null;
  atScreening: boolean;
};

export type ProfileDTO = {
  handle: string;
  name: string;
  bio: string;
  image: string | null;
  joined: string;
};

// Who is looking at the page, and what they may do. Roles are never shown to anyone else.
export type Viewer = { userId: string; isAdmin: boolean; isMod: boolean } | null;

export async function getViewer(user: { id?: string | null; email?: string | null } | null | undefined): Promise<Viewer> {
  if (!user?.id) return null;
  const isAdmin = isAdminEmail(user.email);
  if (isAdmin) return { userId: user.id, isAdmin, isMod: true };
  const profile = await prisma.profile.findUnique({ where: { userId: user.id }, select: { role: true } });
  return { userId: user.id, isAdmin: false, isMod: profile?.role === "moderator" };
}

const filmSelect = { slug: true, title: true, year: true, meta: true, posterUrl: true, reviewsOpen: true } as const;

function toFilm(f: { slug: string; title: string; year: number | null; meta: string; posterUrl: string; reviewsOpen: boolean }): FilmSummary {
  return { slug: f.slug, title: f.title, year: f.year, meta: f.meta, posterUrl: f.posterUrl, reviewsOpen: f.reviewsOpen };
}

const authorSelect = { name: true, image: true, profile: { select: { handle: true, displayName: true } } } as const;

function reviewSelect(viewerId: string | null) {
  return {
    id: true,
    userId: true,
    filmId: true,
    rating: true,
    body: true,
    spoiler: true,
    createdAt: true,
    updatedAt: true,
    film: { select: { slug: true, title: true, posterUrl: true } },
    user: { select: authorSelect },
    // Matches nothing when signed out, so likedByMe is simply false.
    likes: { where: { userId: viewerId ?? "" }, select: { userId: true } },
    _count: { select: { likes: true, comments: true } },
  } satisfies Prisma.ReviewSelect;
}

type ReviewRow = Prisma.ReviewGetPayload<{ select: ReturnType<typeof reviewSelect> }>;

function statsFrom(ratings: number[]): FilmStats {
  const histogram = Array.from({ length: RATING_MAX }, () => 0);
  for (const r of ratings) if (r >= RATING_MIN && r <= RATING_MAX) histogram[r - 1]++;
  const count = ratings.length;
  const average = count ? Math.round((ratings.reduce((a, b) => a + b, 0) / count / 2) * 10) / 10 : null;
  return { count, average, histogram };
}

// Public name only — never the email address.
function publicName(displayName: string | null | undefined, name: string | null | undefined): string {
  return displayName?.trim() || name?.trim() || "SSC member";
}

function toAuthor(u: { name: string | null; image: string | null; profile: { handle: string; displayName: string | null } | null }): Author {
  return { name: publicName(u.profile?.displayName, u.name), handle: u.profile?.handle ?? null, image: u.image };
}

// One query for every (person, film) pair in the list, instead of one per review.
async function checkinSet(rows: { userId: string; filmId: string }[]): Promise<Set<string>> {
  if (!rows.length) return new Set();
  const found = await prisma.checkin.findMany({
    where: { OR: rows.map((r) => ({ userId: r.userId, filmId: r.filmId })) },
    select: { userId: true, filmId: true },
  });
  return new Set(found.map((c) => `${c.userId}|${c.filmId}`));
}

async function toDTOs(rows: ReviewRow[], viewerId: string | null, withComments: boolean): Promise<ReviewDTO[]> {
  const [checked, comments] = await Promise.all([
    checkinSet(rows),
    withComments && rows.length
      ? prisma.comment.findMany({
          where: { reviewId: { in: rows.map((r) => r.id) } },
          orderBy: { createdAt: "asc" },
          select: { id: true, reviewId: true, userId: true, body: true, createdAt: true, user: { select: authorSelect } },
        })
      : Promise.resolve([]),
  ]);
  return rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    body: r.body,
    spoiler: r.spoiler,
    createdAt: r.createdAt.toISOString(),
    // Prisma stamps updatedAt on create too, so only count edits made a minute or more later.
    edited: r.updatedAt.getTime() - r.createdAt.getTime() > 60_000,
    author: toAuthor(r.user),
    film: r.film,
    mine: viewerId !== null && r.userId === viewerId,
    likes: r._count.likes,
    likedByMe: r.likes.length > 0,
    commentCount: r._count.comments,
    comments: withComments
      ? comments
          .filter((c) => c.reviewId === r.id)
          .map((c) => ({ id: c.id, body: c.body, createdAt: c.createdAt.toISOString(), author: toAuthor(c.user), mine: viewerId === c.userId }))
      : null,
    atScreening: checked.has(`${r.userId}|${r.filmId}`),
  }));
}

export async function getFilmPage(slug: string, viewerId: string | null) {
  const film = await prisma.film.findUnique({ where: { slug }, select: { id: true, ...filmSelect } });
  if (!film) return null;
  const [rows, checkedIn] = await Promise.all([
    prisma.review.findMany({ where: { filmId: film.id }, orderBy: { createdAt: "desc" }, select: reviewSelect(viewerId) }),
    viewerId ? prisma.checkin.findUnique({ where: { userId_filmId: { userId: viewerId, filmId: film.id } }, select: { userId: true } }) : null,
  ]);
  const list = await toDTOs(rows, viewerId, true);
  return {
    film: toFilm(film),
    stats: statsFrom(rows.map((r) => r.rating)),
    reviews: list,
    mine: list.find((r) => r.mine) ?? null,
    checkedIn: !!checkedIn,
  };
}

export async function listFilms() {
  const films = await prisma.film.findMany({
    orderBy: [{ screenedOn: "desc" }, { createdAt: "desc" }],
    select: { ...filmSelect, reviews: { select: { rating: true } } },
  });
  return films.map(({ reviews, ...film }) => ({ film: toFilm(film), stats: statsFrom(reviews.map((r) => r.rating)) }));
}

// Home feed. "friends" limits it to people the viewer follows.
export async function getRecentReviews(limit: number, viewerId: string | null, feed: "all" | "friends" = "all"): Promise<ReviewDTO[]> {
  let where: Prisma.ReviewWhereInput = {};
  if (feed === "friends") {
    if (!viewerId) return [];
    const follows = await prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } });
    if (!follows.length) return [];
    where = { userId: { in: follows.map((f) => f.followingId) } };
  }
  const rows = await prisma.review.findMany({ where, orderBy: { createdAt: "desc" }, take: limit, select: reviewSelect(viewerId) });
  return toDTOs(rows, viewerId, false);
}

export async function getProfilePage(handle: string, viewerId: string | null) {
  const profile = await prisma.profile.findUnique({
    where: { handle: handle.toLowerCase() },
    select: {
      userId: true,
      handle: true,
      displayName: true,
      bio: true,
      createdAt: true,
      user: {
        select: {
          name: true,
          image: true,
          _count: { select: { followers: true, following: true } },
          followers: { where: { followerId: viewerId ?? "" }, select: { followerId: true } },
        },
      },
    },
  });
  if (!profile) return null;
  const rows = await prisma.review.findMany({ where: { userId: profile.userId }, orderBy: { createdAt: "desc" }, select: reviewSelect(viewerId) });
  const reviews = await toDTOs(rows, viewerId, false);
  return {
    profile: {
      handle: profile.handle,
      name: publicName(profile.displayName, profile.user.name),
      bio: profile.bio,
      image: profile.user.image,
      joined: profile.createdAt.toISOString(),
    } satisfies ProfileDTO,
    isMe: viewerId === profile.userId,
    followers: profile.user._count.followers,
    following: profile.user._count.following,
    followedByMe: profile.user.followers.length > 0,
    stats: statsFrom(rows.map((r) => r.rating)),
    written: reviews.filter((r) => r.body).length,
    reviews,
  };
}

// --- notifications ---

export type NotificationDTO = {
  id: string;
  type: "like" | "comment" | "follow";
  actor: Author;
  film: { slug: string; title: string } | null;
  snippet: string;
  createdAt: string;
  unread: boolean;
};

export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function getNotifications(userId: string): Promise<NotificationDTO[]> {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      id: true,
      type: true,
      createdAt: true,
      readAt: true,
      actor: { select: authorSelect },
      review: { select: { film: { select: { slug: true, title: true } } } },
      comment: { select: { body: true } },
    },
  });
  return rows.map((n) => ({
    id: n.id,
    type: n.type as NotificationDTO["type"],
    actor: toAuthor(n.actor),
    film: n.review?.film ?? null,
    snippet: n.comment?.body.slice(0, 140) ?? "",
    createdAt: n.createdAt.toISOString(),
    unread: !n.readAt,
  }));
}

// --- profiles ---

export const HANDLE_PATTERN = /^[a-z0-9][a-z0-9_-]{2,19}$/;
// Paths the diary already uses, plus names that would confuse people.
const RESERVED = new Set([
  "film", "films", "settings", "signin", "signout", "login", "logout", "api", "diary", "admin", "about", "help",
  "new", "edit", "search", "u", "user", "users", "vote", "club", "posters", "recap", "ssc", "silverscreen", "me",
  "notifications", "moderator", "moderators", "mod", "report", "reports",
]);

export function handleProblem(handle: string): string | null {
  if (!HANDLE_PATTERN.test(handle)) return "Use 3–20 lowercase letters, numbers, - or _, starting with a letter or number.";
  if (RESERVED.has(handle)) return "That name is reserved. Pick another.";
  return null;
}

function handleFrom(name: string | null): string {
  const base = (name ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 16)
    .replace(/-+$/g, "");
  return base.length >= 3 && !RESERVED.has(base) ? base : "member";
}

// Every signed-in diary user gets a profile; the handle comes from their Google name.
export async function ensureProfile(userId: string): Promise<{ handle: string; displayName: string | null }> {
  const existing = await prisma.profile.findUnique({ where: { userId }, select: { handle: true, displayName: true } });
  if (existing) return existing;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  const base = handleFrom(user?.name ?? null);
  for (let attempt = 0; attempt < 8; attempt++) {
    const handle = attempt === 0 && base !== "member" ? base : `${base}-${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      return await prisma.profile.create({ data: { userId, handle }, select: { handle: true, displayName: true } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        // Either the handle is taken (try another) or a parallel request already made this profile.
        const raced = await prisma.profile.findUnique({ where: { userId }, select: { handle: true, displayName: true } });
        if (raced) return raced;
        continue;
      }
      throw error;
    }
  }
  throw new Error("Could not pick a profile handle");
}
