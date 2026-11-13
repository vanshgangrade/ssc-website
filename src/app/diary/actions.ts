"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RATING_MAX, RATING_MIN, REVIEW_MAX_CHARS, BIO_MAX_CHARS, NAME_MAX_CHARS } from "@/lib/filmRules";
import { ensureProfile, handleProblem } from "@/lib/films";

type Result = { ok: true } | { error: string };

function refresh() {
  // Diary pages read live data; this drops any cached render of them.
  revalidatePath("/diary", "layout");
}

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
    await ensureProfile(session.user.id);
    const spoiler = body ? parsed.data.spoiler : false;
    await prisma.review.upsert({
      where: { userId_filmId: { userId: session.user.id, filmId: film.id } },
      create: { userId: session.user.id, filmId: film.id, rating: parsed.data.rating, body, spoiler },
      update: { rating: parsed.data.rating, body, spoiler },
    });
  } catch (error) {
    console.error("Failed to save review:", error);
    return { error: "Couldn't save your review. Try again." };
  }

  refresh();
  return { ok: true };
}

export async function deleteReview(slug: string): Promise<Result> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sign in first." };

  const film = await prisma.film.findUnique({ where: { slug }, select: { id: true } });
  if (!film) return { error: "That film isn't in the diary." };

  await prisma.review.deleteMany({ where: { userId: session.user.id, filmId: film.id } });
  refresh();
  return { ok: true };
}

const profileSchema = z.object({
  handle: z.string().trim().toLowerCase(),
  displayName: z.string().trim().max(NAME_MAX_CHARS),
  bio: z.string().trim().max(BIO_MAX_CHARS),
});

export async function updateProfile(input: { handle: string; displayName: string; bio: string }): Promise<{ ok: true; handle: string } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sign in first." };

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { error: `Keep your name under ${NAME_MAX_CHARS} and your bio under ${BIO_MAX_CHARS} characters.` };
  const problem = handleProblem(parsed.data.handle);
  if (problem) return { error: problem };

  await ensureProfile(session.user.id);
  try {
    await prisma.profile.update({
      where: { userId: session.user.id },
      data: { handle: parsed.data.handle, displayName: parsed.data.displayName || null, bio: parsed.data.bio },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Someone already has that username." };
    }
    console.error("Failed to update profile:", error);
    return { error: "Couldn't save your profile. Try again." };
  }

  refresh();
  return { ok: true, handle: parsed.data.handle };
}
