import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { SESSION_COOKIE, openSession } from "@/lib/session";
import { getSql } from "@/lib/db";

export const maxDuration = 120;

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

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

export async function POST(request: NextRequest) {
  const session = await openSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  const blob = await put(`documents/${file.name}`, file, {
    access: "private",
    addRandomSuffix: true,
  });

  const sql = getSql();
  const rows = (await sql`
    INSERT INTO documents (pathname, blob_url, filename, size, content_type, uploaded_by)
    VALUES (${blob.pathname}, ${blob.url}, ${file.name}, ${file.size}, ${file.type}, ${session.name})
    RETURNING id, filename, size, content_type, uploaded_by, uploaded_at
  `) as Record<string, unknown>[];
  return NextResponse.json({ doc: rows[0] });
}
