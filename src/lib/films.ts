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

export type ReviewDTO = {
  id: string;
  rating: number;
  body: string;
  spoiler: boolean;
  createdAt: string;
  edited: boolean;
  author: { name: string; image: string | null };
  mine: boolean;
};

const filmSelect = { slug: true, title: true, year: true, meta: true, posterUrl: true, reviewsOpen: true } as const;

function statsFrom(ratings: number[]): FilmStats {
  const histogram = Array.from({ length: RATING_MAX }, () => 0);
  for (const r of ratings) if (r >= RATING_MIN && r <= RATING_MAX) histogram[r - 1]++;
  const count = ratings.length;
  const average = count ? Math.round((ratings.reduce((a, b) => a + b, 0) / count / 2) * 10) / 10 : null;
  return { count, average, histogram };
}

// Public name only — never the email address.
function displayName(name: string | null): string {
  const trimmed = name?.trim();
  return trimmed ? trimmed : "SSC member";
}

export async function getFilmPage(slug: string, userId: string | null) {
  const film = await prisma.film.findUnique({
    where: { slug },
    select: {
      ...filmSelect,
      reviews: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          userId: true,
          rating: true,
          body: true,
          spoiler: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { name: true, image: true } },
        },
      },
    },
  });
  if (!film) return null;

  const { reviews, ...summary } = film;
  const list: ReviewDTO[] = reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    body: r.body,
    spoiler: r.spoiler,
    createdAt: r.createdAt.toISOString(),
    // Prisma stamps updatedAt on create too, so only count edits made a minute or more later.
    edited: r.updatedAt.getTime() - r.createdAt.getTime() > 60_000,
    author: { name: displayName(r.user.name), image: r.user.image },
    mine: userId !== null && r.userId === userId,
  }));

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
  return films.map(({ reviews, ...film }) => ({
    film: film as FilmSummary,
    stats: statsFrom(reviews.map((r) => r.rating)),
  }));
}
