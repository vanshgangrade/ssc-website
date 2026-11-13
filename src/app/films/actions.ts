"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RATING_MAX, RATING_MIN, REVIEW_MAX_CHARS } from "@/lib/filmRules";

type Result = { ok: true } | { error: string };

const reviewSchema = z.object({
  slug: z.string().min(1).max(120),
  rating: z.number().int().min(RATING_MIN).max(RATING_MAX),
  body: z.string().max(REVIEW_MAX_CHARS * 2), // trimmed and re-checked below
  spoiler: z.boolean(),
});

// Creates or replaces the signed-in person's review — one per person per film.
export async function saveReview(input: { slug: string; rating: number; body: string; spoiler: boolean }): Promise<Result> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sign in to rate this film." };

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { error: "Pick a rating between ½ and 5 stars." };
  const body = parsed.data.body.trim();
  if (body.length > REVIEW_MAX_CHARS) return { error: `Keep your review under ${REVIEW_MAX_CHARS} characters.` };

  const film = await prisma.film.findUnique({ where: { slug: parsed.data.slug }, select: { id: true, reviewsOpen: true } });
  if (!film) return { error: "That film isn't in the diary." };
  if (!film.reviewsOpen) return { error: "Reviews for this film are closed." };

  try {
    await prisma.review.upsert({
      where: { userId_filmId: { userId: session.user.id, filmId: film.id } },
      create: { userId: session.user.id, filmId: film.id, rating: parsed.data.rating, body, spoiler: body ? parsed.data.spoiler : false },
      update: { rating: parsed.data.rating, body, spoiler: body ? parsed.data.spoiler : false },
    });
  } catch (error) {
    console.error("Failed to save review:", error);
    return { error: "Couldn't save your review. Try again." };
  }

  revalidatePath(`/films/${parsed.data.slug}`);
  revalidatePath("/films");
  return { ok: true };
}

export async function deleteReview(slug: string): Promise<Result> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sign in first." };

  const film = await prisma.film.findUnique({ where: { slug }, select: { id: true } });
  if (!film) return { error: "That film isn't in the diary." };

  await prisma.review.deleteMany({ where: { userId: session.user.id, filmId: film.id } });

  revalidatePath(`/films/${slug}`);
  revalidatePath("/films");
  return { ok: true };
}
