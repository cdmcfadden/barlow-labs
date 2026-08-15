import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { SESSION_COOKIE, openSession } from "@/lib/session";

const MAX_SIZE = 500 * 1024 * 1024; // 500 MB

// Issues short-lived tokens so members upload directly to Blob storage,
// bypassing the serverless function request-body size limit.
export async function POST(request: NextRequest) {
  const session = await openSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        maximumSizeInBytes: MAX_SIZE,
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {
        // Metadata is registered by the client via POST /api/documents.
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "upload_failed" },
      { status: 400 }
    );
  }
}
