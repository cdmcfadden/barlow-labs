import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, openSession } from "@/lib/session";
import { getSql } from "@/lib/db";

const EDITABLE = ["bootstrapper", "category", "product", "website", "stage", "hrs_wk", "ask", "notes"] as const;
type Editable = (typeof EDITABLE)[number];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await openSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });

  const body = (await request.json()) as { field?: string; value?: string };
  const field = body.field as Editable;
  if (!EDITABLE.includes(field) || typeof body.value !== "string") {
    return NextResponse.json({ error: "bad_field" }, { status: 400 });
  }
  const value = body.value.slice(0, 500);

  const sql = getSql();
  // Field name is validated against the EDITABLE allowlist above.
  await sql.query(
    `UPDATE bootstrappers SET ${field} = $1, updated_by = $2, updated_at = now() WHERE id = $3`,
    [value, session.name, id]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await openSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });

  const sql = getSql();
  await sql`DELETE FROM bootstrappers WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
