import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getPollState, setPollOpen, setPollClosesAt } from "@/lib/poll";

export async function GET() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(await getPollState());
}

const bodySchema = z.object({
  pollOpen: z.boolean().optional(),
  // ISO string to set a deadline, null to clear it. Omit to leave unchanged.
  closesAt: z.string().datetime().nullable().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (parsed.data.pollOpen !== undefined) {
    await setPollOpen(parsed.data.pollOpen);
  }
  if (parsed.data.closesAt !== undefined) {
    await setPollClosesAt(parsed.data.closesAt ? new Date(parsed.data.closesAt) : null);
  }

  return NextResponse.json(await getPollState());
}
