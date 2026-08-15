import { NextRequest, NextResponse } from "next/server";
import { del, get } from "@vercel/blob";
import { SESSION_COOKIE, openSession } from "@/lib/session";
import { getSql } from "@/lib/db";

export const maxDuration = 120;

type DocRow = { blob_url: string; filename: string; content_type: string };

async function findDoc(id: number): Promise<DocRow | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT blob_url, filename, content_type FROM documents WHERE id = ${id}
  `) as DocRow[];
  return rows[0] ?? null;
}

// Streams the (private) blob back to a signed-in member.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await openSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });

  const doc = await findDoc(id);
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const blob = await get(doc.blob_url, { access: "private" });
  if (!blob || blob.statusCode !== 200) {
    return NextResponse.json({ error: "blob_missing" }, { status: 404 });
  }

  const filename = doc.filename.replace(/["\r\n]/g, "");
  return new NextResponse(blob.stream, {
    headers: {
      "Content-Type": doc.content_type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await openSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });

  const doc = await findDoc(id);
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await del(doc.blob_url);
  const sql = getSql();
  await sql`DELETE FROM documents WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
