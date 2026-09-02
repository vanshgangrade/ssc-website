"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { recommendations } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { sendRecommendationConfirmationEmail } from "@/lib/email";

import { searchMovies, getMovieDetails } from "@/lib/tmdb";

export async function searchTMDB(query: string) {
  return await searchMovies(query);
}

export async function getTMDBDetails(id: number) {
  return await getMovieDetails(id);
}

export async function submitRecommendation(movieName: string, tmdbId?: number | null) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be logged in to recommend a movie." };
  }

  if (!movieName || movieName.trim().length === 0) {
    return { error: "Movie name cannot be empty." };
  }

  try {
    await db.insert(recommendations).values({
      movieName: movieName.trim(),
      userId: session.user.id,
      tmdbId: tmdbId ?? null,
    });
    revalidatePath("/admin");
    if (session.user.email) {
      await sendRecommendationConfirmationEmail(session.user.email, movieName.trim());
    }
    return { success: true };
  } catch (error) {
    console.error("Failed to submit recommendation:", error);
    return { error: "An unexpected error occurred." };
  }
}
