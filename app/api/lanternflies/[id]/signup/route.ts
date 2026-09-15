import { NextRequest, NextResponse, after } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { onSlotTaken } from "@/lib/lanternflies/flow";
import { LEGACY_TEAM, ensureMember, takeSlot } from "@/lib/lanternflies/store";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession(request);
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });

  const { member } = await ensureMember(session.team ?? LEGACY_TEAM, session.sub, session.name);
  const result = await takeSlot(id, member);
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 409 });

  // Same notifications as taking a slot from Slack: access details to the tester, a heads-up to the builder.
  after(() => onSlotTaken(result.assignmentId));
  return NextResponse.json({ id: result.assignmentId });
}
