import { prisma } from "@/lib/prisma";

export type CycleGate =
  | { open: true; cycle: { id: string; title: string; closesAt: Date | null } }
  | { open: false; reason: "no-cycle" | "not-open" | "deadline-passed"; cycle: { id: string; title: string; closesAt: Date | null } | null };

/**
 * The cycle the public form should show. Newest cycle wins — creating a new
 * one in the admin panel is how you start next semester's drive.
 */
export async function currentCycle() {
  return prisma.inductionCycle.findFirst({ orderBy: { createdAt: "desc" } });
}

/**
 * Whether the form is accepting submissions right now, and why not if it
 * isn't. Called by both the page (to pick what to render) and the submit API
 * (as the backstop for a tab left open past the deadline).
 */
export async function applicationGate(): Promise<CycleGate> {
  const cycle = await currentCycle();
  if (!cycle) return { open: false, reason: "no-cycle", cycle: null };

  const summary = { id: cycle.id, title: cycle.title, closesAt: cycle.closesAt };

  if (!cycle.isOpen) return { open: false, reason: "not-open", cycle: summary };
  if (cycle.closesAt && cycle.closesAt.getTime() <= Date.now()) {
    return { open: false, reason: "deadline-passed", cycle: summary };
  }
  return { open: true, cycle: summary };
}

export function gateMessage(gate: CycleGate): string {
  if (gate.open) return "";
  switch (gate.reason) {
    case "deadline-passed":
      return "Applications have closed for this cycle. Keep an eye on our socials — we induct again next semester.";
    case "not-open":
      return "Applications aren't open just yet. Check back soon.";
    default:
      return "There's no induction drive running right now. Check back next semester.";
  }
}
