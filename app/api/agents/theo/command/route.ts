import { NextRequest, NextResponse, after } from "next/server";
import { AGENTS } from "@/lib/agents/config";
import { answerCommand } from "@/lib/agents/handle";
import { verifySlackRequest } from "@/lib/lanternflies/verify";

export const maxDuration = 300;

// `/theo question` — works in any conversation, including DMs Theo isn't in.
// The answer is posted once, visibly, through the command's response_url.
export async function POST(request: NextRequest) {
  const agent = AGENTS.theo;
  const raw = await request.text();
  const valid = verifySlackRequest(
    raw,
    request.headers.get("x-slack-request-timestamp"),
    request.headers.get("x-slack-signature"),
    process.env[agent.signingSecretEnv]
  );
  if (!valid) return new NextResponse("invalid signature", { status: 401 });

  const form = new URLSearchParams(raw);
  const text = (form.get("text") ?? "").trim();
  if (!text || form.get("team_id") !== agent.teamId) {
    return NextResponse.json({ response_type: "ephemeral", text: "Ask me anything: `/theo what have we been up to lately?`" });
  }

  after(() =>
    answerCommand(agent, {
      user_id: form.get("user_id") ?? "",
      text,
      response_url: form.get("response_url") ?? "",
      channel_id: form.get("channel_id") ?? "",
    })
  );
  return NextResponse.json({ response_type: "ephemeral", text: "⏳ Theo is thinking…" });
}
