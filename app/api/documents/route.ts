import { NextRequest, NextResponse } from "next/server";
import { head } from "@vercel/blob";
import { SESSION_COOKIE, openSession } from "@/lib/session";
import { getSql } from "@/lib/db";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const session = await openSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sql = getSql();
  const docs = (await sql`
    SELECT id, filename, size, content_type, uploaded_by, uploaded_at
    FROM documents ORDER BY uploaded_at DESC
  `) as Record<string, unknown>[];
  return NextResponse.json({ docs });
}

// Registers metadata for a blob the client already uploaded directly
// (see /api/documents/upload). The blob URL is verified against head()
// so members can only register blobs that actually exist in our store.
export async function POST(request: NextRequest) {
  const session = await openSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    url?: string;
    filename?: string;
    contentType?: string;
  };
  if (typeof body.url !== "string" || typeof body.filename !== "string") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  let blob;
  try {
    blob = await head(body.url);
  } catch {
    return NextResponse.json({ error: "blob_not_found" }, { status: 400 });
  }

  const sql = getSql();
  const rows = (await sql`
    INSERT INTO documents (pathname, blob_url, filename, size, content_type, uploaded_by)
    VALUES (${blob.pathname}, ${blob.url}, ${body.filename.slice(0, 300)},
            ${blob.size}, ${body.contentType ?? ""}, ${session.name})
    RETURNING id, filename, size, content_type, uploaded_by, uploaded_at
  `) as Record<string, unknown>[];
  return NextResponse.json({ doc: rows[0] });
}
