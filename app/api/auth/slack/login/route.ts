import { NextRequest, NextResponse } from "next/server";

// Starts the Sign in with Slack (OpenID Connect) flow.
// Optional ?next=/members/foo sets where to land after sign-in.
export async function GET(request: NextRequest) {
  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "SLACK_CLIENT_ID is not set" }, { status: 500 });
  }

  const state = crypto.randomUUID();
  const next = request.nextUrl.searchParams.get("next") ?? "/members";
  // Only allow same-site relative paths as a post-login destination.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/members";

  const authorize = new URL("https://slack.com/openid/connect/authorize");
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("scope", "openid email profile");
  authorize.searchParams.set("redirect_uri", new URL("/api/auth/slack/callback", request.nextUrl.origin).toString());
  authorize.searchParams.set("state", state);

  const response = NextResponse.redirect(authorize);
  const secure = request.nextUrl.protocol === "https:";
  response.cookies.set("bl_oauth_state", state, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 600,
    path: "/api/auth/slack",
  });
  response.cookies.set("bl_oauth_next", safeNext, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 600,
    path: "/api/auth/slack",
  });
  return response;
}
