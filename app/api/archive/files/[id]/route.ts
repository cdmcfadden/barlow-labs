import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { SESSION_COOKIE, openSession } from "@/lib/session";
import { getSql } from "@/lib/db";
import { WORKSPACES } from "@/lib/workspaces";

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
    SELECT f.blob_pathname, f.name, f.mimetype, f.mirrored, c.team_id
    FROM archive_files f
    JOIN archive_channels c ON c.id = f.channel_id
    WHERE f.id = ${id}
  `) as {
    blob_pathname: string;
    name: string;
    mimetype: string;
    mirrored: boolean;
    team_id: string;
  }[];

  const file = rows[0];
  if (!file?.mirrored || !file.blob_pathname) {
    return NextResponse.json({ error: "not_mirrored" }, { status: 404 });
  }
  // An attachment belongs to the workspace whose channel it was posted in.
  if ((session.team ?? WORKSPACES[0].teamId) !== file.team_id) {
    return NextResponse.json({ error: "wrong_workspace" }, { status: 403 });
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
