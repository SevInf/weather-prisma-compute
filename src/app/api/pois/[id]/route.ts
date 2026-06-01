import { NextResponse } from "next/server";
import { db } from "@/prisma/db";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params;
  const id = Number.parseInt(rawId, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: "`id` must be a positive integer" },
      { status: 400 },
    );
  }

  // `.delete()` returns the count of deleted rows; treat 0 as 404.
  const existing = await db.orm.Poi.first({ id });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.orm.Poi.where({ id }).delete();
  return new NextResponse(null, { status: 204 });
}
