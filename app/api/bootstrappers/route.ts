import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, openSession } from "@/lib/session";
import { getSql, type Bootstrapper } from "@/lib/db";

async function requireSession(request: NextRequest) {
  return openSession(request.cookies.get(SESSION_COOKIE)?.value);
}

export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sql = getSql();
  const rows = (await sql`
    SELECT id, karma, bootstrapper, category, product, website, stage, hrs_wk, ask, notes
    FROM bootstrappers ORDER BY id
  `) as Bootstrapper[];
  return NextResponse.json({ rows });
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sql = getSql();
  const rows = (await sql`
    INSERT INTO bootstrappers (updated_by) VALUES (${session.name})
    RETURNING id, karma, bootstrapper, category, product, website, stage, hrs_wk, ask, notes
  `) as Bootstrapper[];
  return NextResponse.json({ row: rows[0] });
}
