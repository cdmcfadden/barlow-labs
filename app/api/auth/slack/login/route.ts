import { NextRequest, NextResponse } from "next/server";
import { WORKSPACES, workspaceBySlug, workspaceForPath } from "@/lib/workspaces";

// Starts the Sign in with Slack (OpenID Connect) flow.
// Optional ?next=/members/foo sets where to land after sign-in; the workspace
// is inferred from that path, so /f3/... signs in against F3 Cascades.
export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next") ?? "/members";
  // Only allow same-site relative paths as a post-login destination.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/members";

  const workspace =
    workspaceBySlug(request.nextUrl.searchParams.get("workspace") ?? "") ??
    workspaceForPath(safeNext) ??
    (safeNext.startsWith("/f3") ? workspaceBySlug("f3") : null) ??
    WORKSPACES[0];

  const clientId = process.env[workspace.clientIdEnv];
  if (!clientId) {
    return NextResponse.json(
      { error: `${workspace.clientIdEnv} is not set` },
      { status: 500 }
    );
  }

  const state = crypto.randomUUID();
  const authorize = new URL("https://slack.com/openid/connect/authorize");
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("scope", "openid email profile");
  authorize.searchParams.set(
    "redirect_uri",
    new URL("/api/auth/slack/callback", request.nextUrl.origin).toString()
  );
  authorize.searchParams.set("state", state);
  // Preselects the workspace so members skip Slack's "enter your workspace
  // name" step, which is especially painful on mobile.
  authorize.searchParams.set("team", workspace.teamId);

  const response = NextResponse.redirect(authorize);
  const cookie = {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax" as const,
    maxAge: 600,
    path: "/api/auth/slack",
  };
  response.cookies.set("bl_oauth_state", state, cookie);
  response.cookies.set("bl_oauth_next", safeNext, cookie);
  // Tells the callback which app's client secret completes the exchange.
  response.cookies.set("bl_oauth_ws", workspace.slug, cookie);
  return response;
}
