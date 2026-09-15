import { NextRequest, NextResponse, after } from "next/server";
import { commandHelp, createFlyModal, profileModal } from "@/lib/lanternflies/blocks";
import { memberFromSlack, refreshHome, welcome } from "@/lib/lanternflies/flow";
import { openView } from "@/lib/lanternflies/slackApi";
import { balanceOf, getWorkspace } from "@/lib/lanternflies/store";
import { verifySlackRequest } from "@/lib/lanternflies/verify";

export const maxDuration = 60;

// `/lanternflies [new | profile | balance]`
export async function POST(request: NextRequest) {
  const raw = await request.text();
  const valid = verifySlackRequest(
    raw,
    request.headers.get("x-slack-request-timestamp"),
    request.headers.get("x-slack-signature")
  );
  if (!valid) return new NextResponse("invalid signature", { status: 401 });

  const form = new URLSearchParams(raw);
  const ws = await getWorkspace(form.get("team_id") ?? "");
  if (!ws) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Lanternflies isn't fully installed here. Ask a workspace admin to reinstall it.",
    });
  }

  const { member, created } = await memberFromSlack(ws, form.get("user_id") ?? "");
  if (created) after(() => welcome(member));

  const sub = (form.get("text") ?? "").trim().toLowerCase();
  const triggerId = form.get("trigger_id") ?? "";
  if (sub === "new") {
    await openView(ws.token, triggerId, createFlyModal());
    return new NextResponse(null, { status: 200 });
  }
  if (sub === "profile") {
    await openView(ws.token, triggerId, profileModal(member));
    return new NextResponse(null, { status: 200 });
  }

  after(() => refreshHome(member));
  return NextResponse.json({ response_type: "ephemeral", ...commandHelp(await balanceOf(member.id)) });
}
