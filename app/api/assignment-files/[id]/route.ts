import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { requireSession } from "@/lib/api-auth";
import { getSql } from "@/lib/db";

export const maxDuration = 120;

// Streams a lanternfly result file to any signed-in member.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession(request);
  if ("error" in auth) return auth.error;

  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });

  const sql = getSql();
  const rows = (await sql`
    SELECT blob_url, filename FROM lanternfly_files WHERE id = ${id}
  `) as { blob_url: string; filename: string }[];
  const file = rows[0];
  if (!file) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const blob = await get(file.blob_url, { access: "private" });
  if (!blob || blob.statusCode !== 200) {
    return NextResponse.json({ error: "blob_missing" }, { status: 404 });
  }

  const filename = file.filename.replace(/["\r\n]/g, "");
  return new NextResponse(blob.stream, {
    headers: {
      "Content-Type": blob.blob.contentType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
