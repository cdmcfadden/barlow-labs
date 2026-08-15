import { NextRequest, NextResponse } from "next/server";
import { head } from "@vercel/blob";
import { requireSession } from "@/lib/api-auth";
import { getSql } from "@/lib/db";

// Registers a blob the tester already uploaded (via /api/documents/upload)
// as a result file on their assignment.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession(request);
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });

  const body = (await request.json()) as { url?: string; filename?: string };
  if (typeof body.url !== "string" || typeof body.filename !== "string") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const sql = getSql();
  const rows = (await sql`
    SELECT tester_sub FROM lanternfly_assignments WHERE id = ${id}
  `) as { tester_sub: string }[];
  if (!rows[0]) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (rows[0].tester_sub !== session.sub) {
    return NextResponse.json({ error: "Only the tester can add results" }, { status: 403 });
  }

  let blob;
  try {
    blob = await head(body.url);
  } catch {
    return NextResponse.json({ error: "blob_not_found" }, { status: 400 });
  }

  const inserted = (await sql`
    INSERT INTO lanternfly_files (assignment_id, pathname, blob_url, filename, size, uploaded_by)
    VALUES (${id}, ${blob.pathname}, ${blob.url}, ${body.filename.slice(0, 300)},
            ${blob.size}, ${session.name})
    RETURNING id, assignment_id, filename, size, uploaded_at
  `) as Record<string, unknown>[];
  return NextResponse.json({ file: inserted[0] });
}
