import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applicationGate, gateMessage } from "@/lib/inductions/cycle";
import { questionsForCycle } from "@/lib/inductions/questionStore";
import InductionsClient from "./_components/InductionsClient";
import "./inductions.css";

export const metadata: Metadata = {
  title: "Crew Inductions — Silver Screen Club",
  description:
    "Apply to join the Silver Screen Club crew at BITS Pilani, Goa Campus — direction, camera, editing, sound, production and design.",
};

// Application state is per-user and changes the moment someone submits, so
// this page must never be served from a static or cached render.
export const dynamic = "force-dynamic";

export default async function InductionsPage() {
  const [session, gate] = await Promise.all([auth(), applicationGate()]);

  const questions = gate.cycle ? await questionsForCycle(gate.cycle.id) : [];

  // Has this user already applied to the current cycle?
  const existing =
    session?.user?.id && gate.cycle
      ? await prisma.application.findUnique({
          where: { cycleId_userId: { cycleId: gate.cycle.id, userId: session.user.id } },
          select: { id: true, createdAt: true, departments: true, status: true },
        })
      : null;

  return (
    <InductionsClient
      session={
        session?.user
          ? {
              email: session.user.email ?? "",
              name: session.user.name ?? null,
              image: session.user.image ?? null,
              isAdmin: session.user.isAdmin ?? false,
            }
          : null
      }
      cycleTitle={gate.cycle?.title ?? "Crew Inductions"}
      closesAt={gate.cycle?.closesAt ? gate.cycle.closesAt.toISOString() : null}
      isOpen={gate.open}
      questions={questions}
      closedMessage={gateMessage(gate)}
      existing={
        existing
          ? {
              id: existing.id,
              submittedAt: existing.createdAt.toISOString(),
              departments: existing.departments,
              status: existing.status,
            }
          : null
      }
    />
  );
}
