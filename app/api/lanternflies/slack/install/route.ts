import { NextRequest, NextResponse } from "next/server";
import { LF } from "@/lib/lanternflies/config";

// "Add to Slack": starts the OAuth v2 install for a new community.
export async function GET(request: NextRequest) {
  const clientId = process.env.LANTERNFLIES_SLACK_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "LANTERNFLIES_SLACK_CLIENT_ID is not set" }, { status: 500 });
  }

  const state = crypto.randomUUID();
  const authorize = new URL("https://slack.com/oauth/v2/authorize");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("scope", LF.botScopes.join(","));
  authorize.searchParams.set(
    "redirect_uri",
    new URL("/api/lanternflies/slack/oauth", request.nextUrl.origin).toString()
  );
  authorize.searchParams.set("state", state);

  const response = NextResponse.redirect(authorize);
  response.cookies.set("lf_oauth_state", state, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    maxAge: 600,
    path: "/api/lanternflies/slack",
  });
  return response;
}
