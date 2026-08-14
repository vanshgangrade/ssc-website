import { prisma } from "@/lib/prisma";

const SETTINGS_ID = "singleton";

export type PollState = {
  isOpen: boolean;
  closesAt: Date | null;
};

async function getSettings(): Promise<PollState> {
  const settings = await prisma.pollSettings.findUnique({ where: { id: SETTINGS_ID } });
  // No row yet means the poll has never been touched — default to open, no deadline.
  return {
    isOpen: settings?.isOpen ?? true,
    closesAt: settings?.closesAt ?? null,
  };
}

export async function getPollState(): Promise<PollState> {
  return getSettings();
}

// Voting counts as open only while the manual flag is on AND (if set) the deadline hasn't passed.
export async function isPollOpen(): Promise<boolean> {
  const { isOpen, closesAt } = await getSettings();
  if (!isOpen) return false;
  if (closesAt && closesAt.getTime() <= Date.now()) return false;
  return true;
}

export async function setPollOpen(isOpen: boolean): Promise<void> {
  await prisma.pollSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, isOpen },
    update: { isOpen },
  });
}

export async function setPollClosesAt(closesAt: Date | null): Promise<void> {
  await prisma.pollSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, closesAt },
    update: { closesAt },
  });
}
