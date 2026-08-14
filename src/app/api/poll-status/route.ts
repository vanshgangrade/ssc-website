import { NextResponse } from "next/server";
import { getPollState, isPollOpen } from "@/lib/poll";

// Public — only exposes whether voting is open and the deadline, never any vote data.
export async function GET() {
  const [pollOpen, { closesAt }] = await Promise.all([isPollOpen(), getPollState()]);
  return NextResponse.json({ pollOpen, closesAt });
}
