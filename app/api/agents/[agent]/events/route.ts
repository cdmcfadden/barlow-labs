import { NextRequest, NextResponse, after } from "next/server";
import { agentByKey } from "@/lib/agents/config";
import { answerMessage, type IncomingMessage } from "@/lib/agents/handle";
import { verifySlackRequest } from "@/lib/lanternflies/verify";

export const maxDuration = 300;

type Event = IncomingMessage & { type: string; subtype?: string; bot_id?: string };

// Slack Events API for Theo (/api/agents/theo/events) and the F3 Cascades
// Agent (/api/agents/f3/events). Acknowledge within 3 seconds; answer in after().
export async function POST(request: NextRequest, { params }: { params: Promise<{ agent: string }> }) {
  const agent = agentByKey((await params).agent);
  if (!agent) return new NextResponse("not found", { status: 404 });

  const raw = await request.text();
  const valid = verifySlackRequest(
    raw,
    request.headers.get("x-slack-request-timestamp"),
    request.headers.get("x-slack-signature"),
    process.env[agent.signingSecretEnv]
  );
  if (!valid) return new NextResponse("invalid signature", { status: 401 });

  const body = JSON.parse(raw) as { type: string; challenge?: string; team_id?: string; event?: Event };
  if (body.type === "url_verification") return NextResponse.json({ challenge: body.challenge });

  // Slack retries when a delivery looked slow; the first one is already being answered.
  if (request.headers.get("x-slack-retry-num")) return new NextResponse(null, { status: 200 });

  const event = body.event;
  if (body.type !== "event_callback" || !event || body.team_id !== agent.teamId) {
    return new NextResponse(null, { status: 200 });
  }

  const fromPerson = event.user && event.user !== agent.botUserId && !event.bot_id && !event.subtype;
  const isMention = event.type === "app_mention";
  const isDm = event.type === "message" && event.channel_type === "im";
  if (fromPerson && (isMention || isDm)) {
    after(() => answerMessage(agent, event));
  }
  return new NextResponse(null, { status: 200 });
}
