"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { sendRecommendationConfirmationEmail } from "@/lib/email";

export async function submitRecommendation(movieName: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be logged in to recommend a movie." };
  }

  if (!movieName || movieName.trim().length === 0) {
    return { error: "Movie name cannot be empty." };
  }

  try {
    await prisma.recommendation.create({
      data: {
        movieName: movieName.trim(),
        userId: session.user.id,
      },
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
