"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureProfile, getViewer } from "@/lib/films";
import { isAdminEmail } from "@/lib/admin";
import { MAX_POSTER_BYTES } from "@/lib/movies";

type Result = { ok: true } | { error: string };

// Every admin action re-checks the caller; the page being hidden isn't protection on its own.
async function requireMod() {
  const session = await auth();
  const viewer = await getViewer(session?.user);
  return viewer?.isMod ? viewer : null;
}
async function requireAdmin() {
  const session = await auth();
  const viewer = await getViewer(session?.user);
  return viewer?.isAdmin ? viewer : null;
}

function refresh() {
  revalidatePath("/diary", "layout");
}

// --- reports (moderators and admins) ---

export async function dismissReport(reportId: string): Promise<Result> {
  if (!(await requireMod())) return { error: "Not allowed." };
  await prisma.report.updateMany({ where: { id: reportId, resolvedAt: null }, data: { resolvedAt: new Date() } });
  refresh();
  return { ok: true };
}

// Deletes whatever was reported; its reports go with it (cascade).
export async function removeReported(reportId: string): Promise<Result> {
  if (!(await requireMod())) return { error: "Not allowed." };
  const report = await prisma.report.findUnique({ where: { id: reportId }, select: { reviewId: true, commentId: true } });
  if (!report) return { ok: true };
  if (report.commentId) await prisma.comment.deleteMany({ where: { id: report.commentId } });
  else if (report.reviewId) await prisma.review.deleteMany({ where: { id: report.reviewId } });
  refresh();
  return { ok: true };
}

// --- films (admins) ---

function base64Size(dataUri: string): number {
  const comma = dataUri.indexOf(",");
  return Math.floor(((comma >= 0 ? dataUri.length - comma - 1 : dataUri.length) * 3) / 4);
}

const filmSchema = z.object({
  originalSlug: z.string().optional(),
  title: z.string().trim().min(1, "Title is required").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]{1,79}$/, "Use lowercase letters, numbers and dashes for the link"),
  year: z.number().int().min(1888).max(2100).nullable(),
  meta: z.string().trim().max(120),
  posterUrl: z
    .string()
    .trim()
    .min(1, "Add a poster")
    .refine((v) => v.startsWith("data:image/") || v.startsWith("http") || v.startsWith("/"), "Poster must be an upload, an image URL or a site path")
    .refine((v) => !v.startsWith("data:image/") || base64Size(v) <= MAX_POSTER_BYTES, "Poster image is too large (max 3MB)"),
  reviewsOpen: z.boolean(),
  checkInCode: z.string().trim().max(40),
});

export async function saveFilm(input: z.input<typeof filmSchema>): Promise<Result> {
  if (!(await requireAdmin())) return { error: "Only admins can manage films." };
  const parsed = filmSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const { originalSlug, ...f } = parsed.data;
  const data = { ...f, checkInCode: f.checkInCode || null };

  try {
    if (originalSlug) {
      await prisma.film.update({ where: { slug: originalSlug }, data });
    } else {
      await prisma.film.create({ data });
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return { error: "Another film already uses that link." };
    console.error("saveFilm failed:", error);
    return { error: "Couldn't save the film." };
  }
  refresh();
  return { ok: true };
}

// --- moderators (admins) ---

export async function setModerator(identifier: string, on: boolean): Promise<Result> {
  if (!(await requireAdmin())) return { error: "Only admins can change moderators." };
  const id = identifier.trim().toLowerCase().replace(/^@/, "");
  if (!id) return { error: "Enter a username or BITS email." };

  const user = id.includes("@")
    ? await prisma.user.findUnique({ where: { email: id }, select: { id: true, email: true } })
    : await prisma.profile
        .findUnique({ where: { handle: id }, select: { user: { select: { id: true, email: true } } } })
        .then((p) => p?.user ?? null);
  if (!user) return { error: "No member found. They need to have signed in to the diary once." };
  if (isAdminEmail(user.email)) return { error: "That person is already an admin." };

  await ensureProfile(user.id);
  await prisma.profile.update({ where: { userId: user.id }, data: { role: on ? "moderator" : "member" } });
  refresh();
  return { ok: true };
}
