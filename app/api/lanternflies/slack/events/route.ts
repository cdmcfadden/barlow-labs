import { NextRequest, NextResponse, after } from "next/server";
import { memberFromSlack, refreshHome, welcome } from "@/lib/lanternflies/flow";
import { getWorkspace, markUninstalled } from "@/lib/lanternflies/store";
import { verifySlackRequest } from "@/lib/lanternflies/verify";

export const maxDuration = 60;

// Slack Events API. Acknowledge within 3 seconds; do the work in after().
export async function POST(request: NextRequest) {
  const raw = await request.text();
  const valid = verifySlackRequest(
    raw,
    request.headers.get("x-slack-request-timestamp"),
    request.headers.get("x-slack-signature")
  );
  if (!valid) return new NextResponse("invalid signature", { status: 401 });

  const body = JSON.parse(raw) as {
    type: string;
    challenge?: string;
    team_id?: string;
    event?: { type: string; user?: string; tab?: string };
  };
  if (body.type === "url_verification") return NextResponse.json({ challenge: body.challenge });

  // Slack retries when a previous delivery looked slow; the first one is already being handled.
  if (request.headers.get("x-slack-retry-num")) return new NextResponse(null, { status: 200 });

  const teamId = body.team_id ?? "";
  const event = body.event;
  if (body.type === "event_callback" && event) {
    if (event.type === "app_home_opened" && event.tab === "home" && event.user) {
      const userId = event.user;
      after(async () => {
        const ws = await getWorkspace(teamId);
        if (!ws) return;
        const { member, created } = await memberFromSlack(ws, userId);
        if (created) await welcome(member);
        await refreshHome(member);
      });
    } else if (event.type === "app_uninstalled" || event.type === "tokens_revoked") {
      after(() => markUninstalled(teamId));
    }
  }
  return new NextResponse(null, { status: 200 });
}
