import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
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
};

export type ProfileDTO = {
  handle: string;
  name: string;
  bio: string;
  image: string | null;
  joined: string;
};

const filmSelect = { slug: true, title: true, year: true, meta: true, posterUrl: true, reviewsOpen: true } as const;

const reviewSelect = {
  id: true,
  userId: true,
  rating: true,
  body: true,
  spoiler: true,
  createdAt: true,
  updatedAt: true,
  film: { select: { slug: true, title: true, posterUrl: true } },
  user: { select: { name: true, image: true, profile: { select: { handle: true, displayName: true } } } },
} satisfies Prisma.ReviewSelect;

type ReviewRow = Prisma.ReviewGetPayload<{ select: typeof reviewSelect }>;

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

function toDTO(r: ReviewRow, viewerId: string | null): ReviewDTO {
  return {
    id: r.id,
    rating: r.rating,
    body: r.body,
    spoiler: r.spoiler,
    createdAt: r.createdAt.toISOString(),
    // Prisma stamps updatedAt on create too, so only count edits made a minute or more later.
    edited: r.updatedAt.getTime() - r.createdAt.getTime() > 60_000,
    author: { name: publicName(r.user.profile?.displayName, r.user.name), handle: r.user.profile?.handle ?? null, image: r.user.image },
    film: r.film,
    mine: viewerId !== null && r.userId === viewerId,
  };
}

export async function getFilmPage(slug: string, viewerId: string | null) {
  const film = await prisma.film.findUnique({
    where: { slug },
    select: { ...filmSelect, reviews: { orderBy: { createdAt: "desc" }, select: reviewSelect } },
  });
  if (!film) return null;
  const { reviews, ...summary } = film;
  const list = reviews.map((r) => toDTO(r, viewerId));
  return {
    film: summary as FilmSummary,
    stats: statsFrom(reviews.map((r) => r.rating)),
    reviews: list,
    mine: list.find((r) => r.mine) ?? null,
  };
}

export async function listFilms() {
  const films = await prisma.film.findMany({
    orderBy: [{ screenedOn: "desc" }, { createdAt: "desc" }],
    select: { ...filmSelect, reviews: { select: { rating: true } } },
  });
  return films.map(({ reviews, ...film }) => ({ film: film as FilmSummary, stats: statsFrom(reviews.map((r) => r.rating)) }));
}

export async function getRecentReviews(limit: number, viewerId: string | null): Promise<ReviewDTO[]> {
  const rows = await prisma.review.findMany({ orderBy: { createdAt: "desc" }, take: limit, select: reviewSelect });
  return rows.map((r) => toDTO(r, viewerId));
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
      user: { select: { name: true, image: true, reviews: { orderBy: { createdAt: "desc" }, select: reviewSelect } } },
    },
  });
  if (!profile) return null;
  const reviews = profile.user.reviews.map((r) => toDTO(r, viewerId));
  return {
    profile: {
      handle: profile.handle,
      name: publicName(profile.displayName, profile.user.name),
      bio: profile.bio,
      image: profile.user.image,
      joined: profile.createdAt.toISOString(),
    } satisfies ProfileDTO,
    isMe: viewerId === profile.userId,
    stats: statsFrom(profile.user.reviews.map((r) => r.rating)),
    written: reviews.filter((r) => r.body).length,
    reviews,
  };
}

// --- profiles ---

export const HANDLE_PATTERN = /^[a-z0-9][a-z0-9_-]{2,19}$/;
// Paths the diary already uses, plus names that would confuse people.
const RESERVED = new Set([
  "film", "films", "settings", "signin", "signout", "login", "logout", "api", "diary", "admin", "about", "help",
  "new", "edit", "search", "u", "user", "users", "vote", "club", "posters", "recap", "ssc", "silverscreen", "me",
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
