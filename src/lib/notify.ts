import { prisma } from "@/lib/prisma";
import { sendViaFailoverChain } from "@/lib/email";
import { DIARY_ORIGIN } from "@/lib/diaryHost";

// Diary notifications: always recorded in-app; emailed only when the recipient allows it.
// Emails share the daily free-tier quota with vote confirmations, so likes are capped at
// one email per review per day. Failures here must never break the action that caused them.

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function actorName(actorId: string): Promise<string> {
  const u = await prisma.user.findUnique({ where: { id: actorId }, select: { name: true, profile: { select: { displayName: true, handle: true } } } });
  return u?.profile?.displayName?.trim() || u?.name?.trim() || (u?.profile ? `@${u.profile.handle}` : "Someone");
}

function emailHtml(heading: string, line: string, quote: string | null, link: string, linkText: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <p style="letter-spacing:.2em; text-transform:uppercase; font-size:11px; color:#8f8779;">SSC Film Diary</p>
      <h2 style="margin:8px 0 12px;">${esc(heading)}</h2>
      <p>${esc(line)}</p>
      ${quote ? `<blockquote style="margin:14px 0; padding:10px 14px; border-left:3px solid #ffd84a; color:#444;">${esc(quote)}</blockquote>` : ""}
      <p style="margin-top:18px;"><a href="${link}" style="color:#b8860b;">${esc(linkText)}</a></p>
      <p style="margin-top:24px; font-size:12px; color:#999;">You can turn these emails off in your diary settings: ${DIARY_ORIGIN}/settings</p>
    </div>`;
}

export async function notifyLike(actorId: string, reviewId: string) {
  try {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { userId: true, film: { select: { slug: true, title: true } }, user: { select: { email: true, profile: { select: { emailLikes: true } } } } },
    });
    if (!review || review.userId === actorId) return;

    // Liking, unliking and liking again shouldn't stack up notifications.
    const existing = await prisma.notification.findFirst({ where: { userId: review.userId, actorId, type: "like", reviewId }, select: { id: true } });
    if (existing) return;

    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const emailedToday = await prisma.notification.count({ where: { userId: review.userId, type: "like", reviewId, emailed: true, createdAt: { gte: since } } });
    const shouldEmail = (review.user.profile?.emailLikes ?? true) && emailedToday === 0;

    await prisma.notification.create({ data: { userId: review.userId, actorId, type: "like", reviewId, emailed: shouldEmail } });

    if (shouldEmail) {
      const who = await actorName(actorId);
      const link = `${DIARY_ORIGIN}/film/${review.film.slug}`;
      await sendViaFailoverChain(
        review.user.email,
        `${who} liked your review of ${review.film.title}`,
        emailHtml("Your review got a like", `${who} liked your review of ${review.film.title}.`, null, link, "See your review"),
      );
    }
  } catch (error) {
    console.error("notifyLike failed:", error);
  }
}

export async function notifyComment(actorId: string, commentId: string) {
  try {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        body: true,
        reviewId: true,
        review: {
          select: { userId: true, film: { select: { slug: true, title: true } }, user: { select: { email: true, profile: { select: { emailReplies: true } } } } },
        },
      },
    });
    if (!comment || comment.review.userId === actorId) return;

    const shouldEmail = comment.review.user.profile?.emailReplies ?? true;
    await prisma.notification.create({
      data: { userId: comment.review.userId, actorId, type: "comment", reviewId: comment.reviewId, commentId, emailed: shouldEmail },
    });

    if (shouldEmail) {
      const who = await actorName(actorId);
      const link = `${DIARY_ORIGIN}/film/${comment.review.film.slug}#review-${comment.reviewId}`;
      await sendViaFailoverChain(
        comment.review.user.email,
        `${who} replied to your review of ${comment.review.film.title}`,
        emailHtml("New reply on your review", `${who} replied to your review of ${comment.review.film.title}:`, comment.body.slice(0, 300), link, "Read and reply"),
      );
    }
  } catch (error) {
    console.error("notifyComment failed:", error);
  }
}

// Follows are in-app only; an email for every follow would be noise.
export async function notifyFollow(actorId: string, userId: string) {
  try {
    if (actorId === userId) return;
    const existing = await prisma.notification.findFirst({ where: { userId, actorId, type: "follow" }, select: { id: true } });
    if (existing) return;
    await prisma.notification.create({ data: { userId, actorId, type: "follow" } });
  } catch (error) {
    console.error("notifyFollow failed:", error);
  }
}
