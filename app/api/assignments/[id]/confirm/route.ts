import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { getSql } from "@/lib/db";

// Builder confirms a completed assignment: marks it confirmed and transfers
// karma from the builder's bootstrapper row to the tester's, matched by name.
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
  const rows = (await sql`
    SELECT a.id, a.credits, a.status, a.confirmed, a.tester_name,
           f.builder_sub, f.builder_name
    FROM lanternfly_assignments a
    JOIN lanternflies f ON f.id = a.lanternfly_id
    WHERE a.id = ${id}
  `) as {
    credits: number;
    status: string;
    confirmed: boolean;
    tester_name: string;
    builder_sub: string;
    builder_name: string;
  }[];
  const assignment = rows[0];
  if (!assignment) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (assignment.builder_sub !== session.sub) {
    return NextResponse.json({ error: "Only the builder can confirm" }, { status: 403 });
  }
  if (assignment.confirmed) {
    return NextResponse.json({ error: "Already confirmed" }, { status: 409 });
  }
  if (assignment.status !== "completed") {
    return NextResponse.json(
      { error: "Tester must mark the task completed first" },
      { status: 409 }
    );
  }

  // Guard against double-transfer under concurrent confirms.
  const updated = (await sql`
    UPDATE lanternfly_assignments SET confirmed = true
    WHERE id = ${id} AND confirmed = false
    RETURNING id
  `) as { id: number }[];
  if (updated.length === 0) {
    return NextResponse.json({ error: "Already confirmed" }, { status: 409 });
  }

  await sql`
    UPDATE bootstrappers SET karma = karma - ${assignment.credits}
    WHERE lower(trim(bootstrapper)) = lower(trim(${assignment.builder_name}))
  `;
  await sql`
    UPDATE bootstrappers SET karma = karma + ${assignment.credits}
    WHERE lower(trim(bootstrapper)) = lower(trim(${assignment.tester_name}))
  `;
  return NextResponse.json({ ok: true });
}
