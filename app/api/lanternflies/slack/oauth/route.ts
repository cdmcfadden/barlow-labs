import { NextRequest, NextResponse, after } from "next/server";
import { memberFromSlack, refreshHome, welcome } from "@/lib/lanternflies/flow";
import { getWorkspace, saveWorkspace } from "@/lib/lanternflies/store";

export const maxDuration = 60;

// Finishes an install: stores the workspace's bot token (encrypted) and
// welcomes whoever installed it.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const done = (query: string) => {
    const response = NextResponse.redirect(new URL(`/lanternflies?${query}`, request.nextUrl.origin));
    response.cookies.delete("lf_oauth_state");
    return response;
  };

  if (params.get("error")) return done(`install_error=${encodeURIComponent(params.get("error") ?? "")}`);
  if (!code || !state || state !== request.cookies.get("lf_oauth_state")?.value) {
    return done("install_error=state_mismatch");
  }

  const exchange = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.LANTERNFLIES_SLACK_CLIENT_ID ?? "",
      client_secret: process.env.LANTERNFLIES_SLACK_CLIENT_SECRET ?? "",
      code,
      redirect_uri: new URL("/api/lanternflies/slack/oauth", request.nextUrl.origin).toString(),
    }),
  });
  const data = (await exchange.json()) as {
    ok: boolean;
    error?: string;
    access_token?: string;
    bot_user_id?: string;
    team?: { id: string; name: string };
    authed_user?: { id: string };
  };
  if (!data.ok || !data.access_token || !data.team || !data.bot_user_id || !data.authed_user) {
    return done(`install_error=${encodeURIComponent(data.error ?? "exchange_failed")}`);
  }

  await saveWorkspace({
    teamId: data.team.id,
    teamName: data.team.name,
    botUserId: data.bot_user_id,
    token: data.access_token,
    installedBy: data.authed_user.id,
  });

  const installerId = data.authed_user.id;
  const teamId = data.team.id;
  after(async () => {
    const ws = await getWorkspace(teamId);
    if (!ws) return;
    const { member } = await memberFromSlack(ws, installerId);
    await welcome(member);
    await refreshHome(member);
  });

  return done(`installed=${encodeURIComponent(data.team.name)}`);
}
