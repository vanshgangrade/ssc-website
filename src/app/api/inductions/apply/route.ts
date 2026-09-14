import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applicationGate, gateMessage } from "@/lib/inductions/cycle";
import { submitSchema, validateAnswers } from "@/lib/inductions/validation";
import { questionsForCycle } from "@/lib/inductions/questionStore";
import { sendApplicationConfirmationEmail } from "@/lib/email";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in before submitting your application." }, { status: 401 });
  }

  // Backstop for a tab left open past the deadline — the page already gates
  // on this, but a stale client can still POST.
  const gate = await applicationGate();
  if (!gate.open) {
    return NextResponse.json({ error: gateMessage(gate) }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Some fields are invalid. Check your answers." },
      { status: 400 }
    );
  }

  const { basics, answers } = parsed.data;

  // The client checks this too; this is the copy that counts — and it reads
  // the bank from the database, so a stale tab can't answer a question the
  // admins have since removed or reworded.
  const bank = await questionsForCycle(gate.cycle.id);
  const checked = validateAnswers(bank, basics.departments, answers);
  if (!checked.ok) {
    return NextResponse.json(
      { error: "Some required questions are still blank. Go back and fill them in." },
      { status: 400 }
    );
  }

  try {
    const application = await prisma.application.create({
      data: {
        cycleId: gate.cycle.id,
        userId: session.user.id,
        fullName: basics.fullName,
        phone: basics.phone,
        bitsEmail: basics.bitsEmail,
        bitsId: basics.bitsId,
        yearOfStudy: basics.yearOfStudy,
        hostel: basics.hostel || null,
        departments: basics.departments,
        answers: checked.stored,
      },
      select: { id: true },
    });

    // A failed confirmation email must never fail the application — the row
    // is already committed and the attempt is logged to EmailLog either way.
    const to = basics.bitsEmail || session.user.email;
    if (to) {
      await sendApplicationConfirmationEmail(to, basics.fullName, basics.departments, application.id);
    }

    return NextResponse.json({ id: application.id }, { status: 201 });
  } catch (error) {
    // P2002 = unique violation on (cycleId, userId) or (cycleId, bitsId):
    // this person already applied, from this account or another one.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "An application already exists for this BITS ID. One per person, per cycle." },
        { status: 409 }
      );
    }
    console.error("Application submit failed:", error);
    return NextResponse.json({ error: "Could not submit your application. Try again." }, { status: 500 });
  }
}
