import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { movies as moviesTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { movieInputSchema } from "@/lib/movieValidation";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = movieInputSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    const res = await db.update(moviesTable).set(parsed.data).where(eq(moviesTable.id, id)).returning();
    if (res.length === 0) throw new Error("Not found");
    return NextResponse.json({ movie: res[0] });
  } catch {
    return NextResponse.json({ error: "Movie not found" }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  try {
    // onDelete: cascade is set in schema
    const res = await db.delete(moviesTable).where(eq(moviesTable.id, id)).returning();
    if (res.length === 0) throw new Error("Not found");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Movie not found" }, { status: 404 });
  }
}
