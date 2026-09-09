import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, openSession } from "@/lib/session";
import { WORKSPACES, workspaceBySlug } from "@/lib/workspaces";

/**
 * Gates each workspace's area on a session from that workspace. Sessions
 * issued before the site archived more than one workspace carry no team and
 * can only have come from Barlow Labs, so they are read as such.
 */
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const required = path.startsWith("/f3") ? workspaceBySlug("f3")! : WORKSPACES[0];

  const session = await openSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (session && (session.team ?? WORKSPACES[0].teamId) === required.teamId) {
    return NextResponse.next();
  }

  // No session, or one from the other workspace: send them through sign-in for
  // the workspace they are trying to reach. People who belong to both — and a
  // session only ever holds one — would otherwise dead-end on access-denied.
  const login = new URL("/api/auth/slack/login", request.nextUrl.origin);
  login.searchParams.set("next", path + request.nextUrl.search);
  login.searchParams.set("workspace", required.slug);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/members/:path*", "/f3/:path*"],
};
