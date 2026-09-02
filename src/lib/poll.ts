import { db } from "@/db";
import { pollSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

const SETTINGS_ID = "singleton";

export type PollState = {
  isOpen: boolean;
  closesAt: Date | null;
};

async function getSettings(): Promise<PollState> {
  const res = await db.select().from(pollSettings).where(eq(pollSettings.id, SETTINGS_ID)).limit(1);
  const settings = res[0];
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
  await db.insert(pollSettings)
    .values({ id: SETTINGS_ID, isOpen })
    .onConflictDoUpdate({ target: pollSettings.id, set: { isOpen } });
}

export async function setPollClosesAt(closesAt: Date | null): Promise<void> {
  await db.insert(pollSettings)
    .values({ id: SETTINGS_ID, closesAt })
    .onConflictDoUpdate({ target: pollSettings.id, set: { closesAt } });
}
