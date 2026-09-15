import { NextRequest, NextResponse, after } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { onConfirmed } from "@/lib/lanternflies/flow";
import { LEGACY_TEAM, confirmAssignment, ensureMember, getAssignment } from "@/lib/lanternflies/store";

// Builder confirms a completed assignment. Credits move through the shared
// lf_ledger (the same one the Slack app uses), keyed by Slack member rather
// than by display name.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession(request);
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });

  const assignment = await getAssignment(id);
  if (!assignment) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { member } = await ensureMember(session.team ?? LEGACY_TEAM, session.sub, session.name);
  if (assignment.builder_member_id !== member.id) {
    return NextResponse.json({ error: "Only the builder can confirm" }, { status: 403 });
  }
  if (assignment.confirmed) {
    return NextResponse.json({ error: "Already confirmed" }, { status: 409 });
  }
  if (assignment.status !== "completed") {
    return NextResponse.json({ error: "Tester must mark the task completed first" }, { status: 409 });
  }

  const confirmed = await confirmAssignment(id, member, 5);
  if (!confirmed) return NextResponse.json({ error: "Already confirmed" }, { status: 409 });

  after(() => onConfirmed(id, 5));
  return NextResponse.json({ ok: true });
}
