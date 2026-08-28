import { prisma } from "@/lib/prisma";
import type { Poll, PollStatus } from "@prisma/client";

export type PollState = {
  pollId: string | null;
  title: string | null;
  isOpen: boolean;
  closesAt: Date | null;
};

async function getLivePoll(): Promise<Poll | null> {
  return prisma.poll.findFirst({ where: { status: "LIVE" } });
}

// The public site and vote API only ever care about the one LIVE poll.
export async function getPollState(): Promise<PollState> {
  const poll = await getLivePoll();
  if (!poll) return { pollId: null, title: null, isOpen: false, closesAt: null };
  return { pollId: poll.id, title: poll.title, isOpen: poll.isOpen, closesAt: poll.closesAt };
}

// Voting counts as open only while a poll is live AND its manual flag is on
// AND (if set) its deadline hasn't passed.
export async function isPollOpen(): Promise<boolean> {
  const { isOpen, closesAt } = await getPollState();
  if (!isOpen) return false;
  if (closesAt && closesAt.getTime() <= Date.now()) return false;
  return true;
}

export async function setPollOpen(pollId: string, isOpen: boolean): Promise<void> {
  await prisma.poll.update({ where: { id: pollId }, data: { isOpen } });
}

export async function setPollClosesAt(pollId: string, closesAt: Date | null): Promise<void> {
  await prisma.poll.update({ where: { id: pollId }, data: { closesAt } });
}

// --- Admin poll management ---

export async function listPolls() {
  return prisma.poll.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { movies: true, votes: true } } },
  });
}

export async function createPoll(title: string): Promise<Poll> {
  const maxOrder = await prisma.poll.aggregate({ _max: { order: true } });
  return prisma.poll.create({ data: { title, order: (maxOrder._max.order ?? -1) + 1 } });
}

export async function renamePoll(pollId: string, title: string): Promise<void> {
  await prisma.poll.update({ where: { id: pollId }, data: { title } });
}

// Only one poll may be LIVE at a time — this atomically demotes whichever
// poll currently holds that status before promoting the new one.
export async function setLivePoll(pollId: string): Promise<void> {
  await prisma.$transaction([
    prisma.poll.updateMany({ where: { status: "LIVE" }, data: { status: "CLOSED" } }),
    prisma.poll.update({ where: { id: pollId }, data: { status: "LIVE" } }),
  ]);
}

export async function setPollStatus(pollId: string, status: PollStatus): Promise<void> {
  await prisma.poll.update({ where: { id: pollId }, data: { status } });
}

// Cascades to that poll's movies and votes only — other polls are untouched.
export async function deletePoll(pollId: string): Promise<void> {
  await prisma.poll.delete({ where: { id: pollId } });
}
