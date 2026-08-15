import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, openSession, type Session } from "@/lib/session";

export async function requireSession(
  request: NextRequest
): Promise<{ session: Session } | { error: NextResponse }> {
  const session = await openSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  return { session };
}
