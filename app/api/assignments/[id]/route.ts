import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { getSql } from "@/lib/db";

const STATUSES = ["not_started", "in_process", "completed", "problem"] as const;

// Tester updates their own notes/status.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession(request);
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });

  const body = (await request.json()) as { notes?: string; status?: string };
  const sql = getSql();
  const rows = (await sql`
    SELECT tester_sub, confirmed FROM lanternfly_assignments WHERE id = ${id}
  `) as { tester_sub: string; confirmed: boolean }[];
  const assignment = rows[0];
  if (!assignment) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (assignment.tester_sub !== session.sub) {
    return NextResponse.json({ error: "Only the tester can update this row" }, { status: 403 });
  }
  if (assignment.confirmed) {
    return NextResponse.json({ error: "Already confirmed complete" }, { status: 409 });
  }

  if (typeof body.notes === "string") {
    await sql`UPDATE lanternfly_assignments SET notes = ${body.notes} WHERE id = ${id}`;
  }
  if (typeof body.status === "string") {
    if (!STATUSES.includes(body.status as (typeof STATUSES)[number])) {
      return NextResponse.json({ error: "bad_status" }, { status: 400 });
    }
    await sql`UPDATE lanternfly_assignments SET status = ${body.status} WHERE id = ${id}`;
  }
  return NextResponse.json({ ok: true });
}
