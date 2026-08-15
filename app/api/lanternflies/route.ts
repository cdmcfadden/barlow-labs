import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { getSql } from "@/lib/db";

// A lanternfly is worth 1 credit per 20 minutes of estimated effort, rounded up.
function creditsForMinutes(minutes: number): number {
  return Math.max(1, Math.ceil(minutes / 20));
}

export async function GET(request: NextRequest) {
  const auth = await requireSession(request);
  if ("error" in auth) return auth.error;

  const sql = getSql();
  const flies = (await sql`
    SELECT id, builder_sub, builder_name, title, description, effort_minutes,
           slots, access_directions, credits, created_at
    FROM lanternflies ORDER BY created_at DESC
  `) as Record<string, unknown>[];
  const assignments = (await sql`
    SELECT id, lanternfly_id, tester_sub, tester_name, credits, notes, status,
           confirmed, created_at
    FROM lanternfly_assignments ORDER BY created_at
  `) as Record<string, unknown>[];
  const files = (await sql`
    SELECT id, assignment_id, filename, size, uploaded_at
    FROM lanternfly_files ORDER BY uploaded_at
  `) as Record<string, unknown>[];

  return NextResponse.json({ flies, assignments, files });
}

export async function POST(request: NextRequest) {
  const auth = await requireSession(request);
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const body = (await request.json()) as {
    title?: string;
    description?: string;
    effortMinutes?: number;
    slots?: number;
    accessDirections?: string;
  };

  const title = (body.title ?? "").trim();
  const effortMinutes = Number(body.effortMinutes);
  const slots = Number(body.slots);
  if (!title || title.length > 100) {
    return NextResponse.json({ error: "title must be 1-100 characters" }, { status: 400 });
  }
  if (!Number.isInteger(effortMinutes) || effortMinutes < 1 || effortMinutes > 60 * 24 * 7) {
    return NextResponse.json({ error: "invalid effort" }, { status: 400 });
  }
  if (!Number.isInteger(slots) || slots < 1 || slots > 50) {
    return NextResponse.json({ error: "slots must be 1-50" }, { status: 400 });
  }

  const sql = getSql();
  const rows = (await sql`
    INSERT INTO lanternflies
      (builder_sub, builder_name, title, description, effort_minutes, slots,
       access_directions, credits)
    VALUES
      (${session.sub}, ${session.name}, ${title}, ${body.description ?? ""},
       ${effortMinutes}, ${slots}, ${body.accessDirections ?? ""},
       ${creditsForMinutes(effortMinutes)})
    RETURNING id
  `) as { id: number }[];
  return NextResponse.json({ id: rows[0].id });
}
