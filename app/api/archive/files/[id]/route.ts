import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { SESSION_COOKIE, openSession } from "@/lib/session";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Serves an archived Slack attachment. Mirrored files live in a private Blob
 * store, so this route — behind the members session check — is the only way in.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await openSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const sql = getSql();
  const rows = (await sql`
    SELECT blob_pathname, name, mimetype, mirrored FROM archive_files WHERE id = ${id}
  `) as { blob_pathname: string; name: string; mimetype: string; mirrored: boolean }[];

  const file = rows[0];
  if (!file?.mirrored || !file.blob_pathname) {
    return NextResponse.json({ error: "not_mirrored" }, { status: 404 });
  }

  const blob = await get(file.blob_pathname, { access: "private" });
  if (!blob?.stream) {
    return NextResponse.json({ error: "blob_unavailable" }, { status: 502 });
  }

  return new NextResponse(blob.stream, {
    headers: {
      "Content-Type": file.mimetype || blob.blob.contentType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${file.name.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
