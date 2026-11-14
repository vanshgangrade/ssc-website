"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RATING_MAX, RATING_MIN, REVIEW_MAX_CHARS, BIO_MAX_CHARS, NAME_MAX_CHARS, COMMENT_MAX_CHARS, REPORT_MAX_CHARS } from "@/lib/filmRules";
import { ensureProfile, getViewer, handleProblem } from "@/lib/films";
import { notifyComment, notifyFollow, notifyLike } from "@/lib/notify";

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

// --- screening check-in ---

export async function checkIn(slug: string, code: string): Promise<Result> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sign in first." };
  const film = await prisma.film.findUnique({ where: { slug }, select: { id: true, checkInCode: true } });
  if (!film?.checkInCode) return { error: "Check-in isn't open for this film." };
  if (code.trim().toLowerCase() !== film.checkInCode.trim().toLowerCase()) return { error: "That code doesn't match. Check what was announced at the screening." };
  await ensureProfile(session.user.id);
  await prisma.checkin.upsert({
    where: { userId_filmId: { userId: session.user.id, filmId: film.id } },
    create: { userId: session.user.id, filmId: film.id },
    update: {},
  });
  refresh();
  return { ok: true };
}

// --- likes ---

export async function toggleLike(reviewId: string): Promise<{ ok: true; liked: boolean } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sign in to like reviews." };
  const userId = session.user.id;
  const review = await prisma.review.findUnique({ where: { id: reviewId }, select: { userId: true } });
  if (!review) return { error: "That review was deleted." };
  if (review.userId === userId) return { error: "You can't like your own review." };

  const key = { userId_reviewId: { userId, reviewId } };
  const existing = await prisma.reviewLike.findUnique({ where: key, select: { userId: true } });
  if (existing) {
    await prisma.reviewLike.delete({ where: key });
  } else {
    await ensureProfile(userId);
    await prisma.reviewLike.create({ data: { userId, reviewId } }).catch(() => null); // a double-tap race is fine
    after(() => notifyLike(userId, reviewId));
  }
  refresh();
  return { ok: true, liked: !existing };
}

// --- comments ---

export async function addComment(reviewId: string, body: string): Promise<Result> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sign in to reply." };
  const text = body.trim();
  if (!text) return { error: "Write something first." };
  if (text.length > COMMENT_MAX_CHARS) return { error: `Keep replies under ${COMMENT_MAX_CHARS} characters.` };
  const review = await prisma.review.findUnique({ where: { id: reviewId }, select: { id: true } });
  if (!review) return { error: "That review was deleted." };

  const userId = session.user.id;
  await ensureProfile(userId);
  const comment = await prisma.comment.create({ data: { reviewId, userId, body: text }, select: { id: true } });
  after(() => notifyComment(userId, comment.id));
  refresh();
  return { ok: true };
}

// Authors can delete their own comments; moderators and admins can delete any.
export async function deleteComment(commentId: string): Promise<Result> {
  const session = await auth();
  const viewer = await getViewer(session?.user);
  if (!viewer) return { error: "Sign in first." };
  const comment = await prisma.comment.findUnique({ where: { id: commentId }, select: { userId: true } });
  if (!comment) return { ok: true };
  if (comment.userId !== viewer.userId && !viewer.isMod) return { error: "You can't delete that." };
  await prisma.comment.delete({ where: { id: commentId } });
  refresh();
  return { ok: true };
}

// Moderators remove someone else's review (authors use deleteReview on their own).
export async function removeReview(reviewId: string): Promise<Result> {
  const session = await auth();
  const viewer = await getViewer(session?.user);
  if (!viewer) return { error: "Sign in first." };
  const review = await prisma.review.findUnique({ where: { id: reviewId }, select: { userId: true } });
  if (!review) return { ok: true };
  if (review.userId !== viewer.userId && !viewer.isMod) return { error: "You can't delete that." };
  await prisma.review.delete({ where: { id: reviewId } });
  refresh();
  return { ok: true };
}

// --- reports ---

export async function report(target: { reviewId?: string; commentId?: string }, reason: string): Promise<Result> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sign in to report." };
  if (!!target.reviewId === !!target.commentId) return { error: "Nothing to report." };
  const text = reason.trim().slice(0, REPORT_MAX_CHARS);

  // One open report per person per item is plenty.
  const open = await prisma.report.findFirst({
    where: { reporterId: session.user.id, reviewId: target.reviewId ?? null, commentId: target.commentId ?? null, resolvedAt: null },
    select: { id: true },
  });
  if (open) return { ok: true };

  try {
    await prisma.report.create({ data: { reporterId: session.user.id, reviewId: target.reviewId, commentId: target.commentId, reason: text } });
  } catch {
    return { error: "That was already removed." };
  }
  return { ok: true };
}

// --- follows ---

export async function toggleFollow(handle: string): Promise<{ ok: true; following: boolean } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sign in to follow people." };
  const me = session.user.id;
  const target = await prisma.profile.findUnique({ where: { handle: handle.toLowerCase() }, select: { userId: true } });
  if (!target) return { error: "That member doesn't exist." };
  if (target.userId === me) return { error: "You can't follow yourself." };

  const key = { followerId_followingId: { followerId: me, followingId: target.userId } };
  const existing = await prisma.follow.findUnique({ where: key, select: { followerId: true } });
  if (existing) {
    await prisma.follow.delete({ where: key });
  } else {
    await ensureProfile(me);
    await prisma.follow.create({ data: { followerId: me, followingId: target.userId } }).catch(() => null);
    after(() => notifyFollow(me, target.userId));
  }
  refresh();
  return { ok: true, following: !existing };
}

// --- notifications ---

export async function markNotificationsRead(): Promise<Result> {
  const session = await auth();
  if (!session?.user?.id) return { ok: true };
  await prisma.notification.updateMany({ where: { userId: session.user.id, readAt: null }, data: { readAt: new Date() } });
  refresh();
  return { ok: true };
}

export async function updateEmailPrefs(prefs: { emailLikes: boolean; emailReplies: boolean }): Promise<Result> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sign in first." };
  await ensureProfile(session.user.id);
  await prisma.profile.update({
    where: { userId: session.user.id },
    data: { emailLikes: !!prefs.emailLikes, emailReplies: !!prefs.emailReplies },
  });
  return { ok: true };
}
