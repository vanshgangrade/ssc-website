import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { movies as moviesTable } from "@/db/schema";
import { asc, max } from "drizzle-orm";
import { movieInputSchema } from "@/lib/movieValidation";

export async function GET() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const movies = await db.select().from(moviesTable).orderBy(asc(moviesTable.order));
  return NextResponse.json({ movies });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = movieInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const maxOrderRes = await db.select({ maxOrder: max(moviesTable.order) }).from(moviesTable);
  const currentMax = maxOrderRes[0]?.maxOrder ?? -1;
  const insertData = { ...parsed.data, order: parsed.data.order ?? currentMax + 1 };
  
  const res = await db.insert(moviesTable).values(insertData).returning();
  const movie = res[0];

  return NextResponse.json({ movie }, { status: 201 });
}
