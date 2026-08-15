import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { getSql } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession(request);
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });

  const sql = getSql();
  const flies = (await sql`
    SELECT id, builder_sub, slots, credits FROM lanternflies WHERE id = ${id}
  `) as { builder_sub: string; slots: number; credits: number }[];
  const fly = flies[0];
  if (!fly) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (fly.builder_sub === session.sub) {
    return NextResponse.json({ error: "You can't test your own lanternfly" }, { status: 400 });
  }

  const taken = (await sql`
    SELECT count(*)::int AS count FROM lanternfly_assignments WHERE lanternfly_id = ${id}
  `) as { count: number }[];
  if (taken[0].count >= fly.slots) {
    return NextResponse.json({ error: "All slots are taken" }, { status: 409 });
  }

  try {
    const rows = (await sql`
      INSERT INTO lanternfly_assignments (lanternfly_id, tester_sub, tester_name, credits)
      VALUES (${id}, ${session.sub}, ${session.name}, ${fly.credits})
      RETURNING id
    `) as { id: number }[];
    return NextResponse.json({ id: rows[0].id });
  } catch {
    return NextResponse.json({ error: "You already have a slot on this one" }, { status: 409 });
  }
}
