import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sealSession } from "@/lib/session";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Because the Barlow Labs Slack app is not distributed, Slack only completes
// this flow for members of the Barlow Labs workspace — that installation
// boundary is the access control. The optional SLACK_TEAM_ID check below is a
// second line of defense if the app is ever accidentally distributed.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const expectedState = request.cookies.get("bl_oauth_state")?.value;
  const next = request.cookies.get("bl_oauth_next")?.value ?? "/members";

  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/access-denied?reason=${encodeURIComponent(reason)}`, request.nextUrl.origin));

  if (!code || !state || !expectedState || state !== expectedState) {
    return fail("state_mismatch");
  }

  const tokenResponse = await fetch("https://slack.com/api/openid.connect.token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID ?? "",
      client_secret: process.env.SLACK_CLIENT_SECRET ?? "",
      code,
      grant_type: "authorization_code",
      redirect_uri: new URL("/api/auth/slack/callback", request.nextUrl.origin).toString(),
    }),
  });
  const tokenData = await tokenResponse.json();
  if (!tokenData.ok || !tokenData.id_token) {
    return fail(tokenData.error ?? "token_exchange_failed");
  }

  // The ID token comes straight from slack.com over TLS in the exchange above,
  // so decoding without signature verification is safe here.
  let claims: Record<string, unknown>;
  try {
    const payload = (tokenData.id_token as string).split(".")[1];
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return fail("bad_id_token");
  }

  const teamId = claims["https://slack.com/team_id"] as string | undefined;
  const expectedTeam = process.env.SLACK_TEAM_ID;
  if (expectedTeam && teamId !== expectedTeam) {
    return fail("wrong_workspace");
  }

  const session = await sealSession({
    sub: (claims["https://slack.com/user_id"] as string) ?? (claims.sub as string) ?? "",
    name: (claims.name as string) ?? "",
    email: (claims.email as string) ?? "",
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  });

  const response = NextResponse.redirect(new URL(next, request.nextUrl.origin));
  response.cookies.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
  response.cookies.delete("bl_oauth_state");
  response.cookies.delete("bl_oauth_next");
  return response;
}
