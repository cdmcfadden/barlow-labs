import { NextRequest, NextResponse, after } from "next/server";
import { completeModal, createFlyModal, profileModal } from "@/lib/lanternflies/blocks";
import { LF, creditsForMinutes } from "@/lib/lanternflies/config";
import {
  dispatchOffers,
  memberFromSlack,
  notify,
  onCompleted,
  onConfirmed,
  onReopened,
  onSlotTaken,
  refreshHome,
} from "@/lib/lanternflies/flow";
import { openView, respond } from "@/lib/lanternflies/slackApi";
import {
  balanceOf,
  closeFly,
  completeAssignment,
  confirmAssignment,
  createFly,
  getAssignment,
  getWorkspace,
  reopenAssignment,
  setOfferResponse,
  takeSlot,
  updateProfile,
  type Circle,
  type Member,
} from "@/lib/lanternflies/store";
import { verifySlackRequest } from "@/lib/lanternflies/verify";

export const maxDuration = 60;

type StateValue = {
  value?: string | null;
  selected_option?: { value: string } | null;
  selected_options?: { value: string }[];
};
type Values = Record<string, Record<string, StateValue>>;

const text = (v: Values, block: string) => (v[block]?.v?.value ?? "").trim();
const choice = (v: Values, block: string) => v[block]?.v?.selected_option?.value ?? "";
const choices = (v: Values, block: string) => (v[block]?.v?.selected_options ?? []).map((o) => o.value);
const platformsFrom = (v: Values, block: string) =>
  choices(v, block).filter((p) => (LF.platforms as readonly string[]).includes(p));
const circleFrom = (v: Values, block: string): Circle => (choice(v, block) === "community" ? "community" : "everyone");

const ok = () => new NextResponse(null, { status: 200 });
const fieldErrors = (errors: Record<string, string>) => NextResponse.json({ response_action: "errors", errors });

/** Tells the member something: in place of the clicked message when there is one, else by DM. */
async function tell(member: Member, responseUrl: string | undefined, message: string) {
  if (responseUrl) await respond(responseUrl, { response_type: "ephemeral", replace_original: false, text: message });
  else await notify(member, { text: message, blocks: [{ type: "section", text: { type: "mrkdwn", text: message } }] });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const valid = verifySlackRequest(
    raw,
    request.headers.get("x-slack-request-timestamp"),
    request.headers.get("x-slack-signature")
  );
  if (!valid) return new NextResponse("invalid signature", { status: 401 });

  const payload = JSON.parse(new URLSearchParams(raw).get("payload") ?? "{}");
  const ws = await getWorkspace(payload.team?.id ?? payload.user?.team_id);
  if (!ws || !payload.user?.id) return ok();
  const { member } = await memberFromSlack(ws, payload.user.id);

  if (payload.type === "block_actions") {
    const action = payload.actions?.[0] ?? {};
    const [name, arg] = String(action.action_id ?? "").split(":");
    const id = Number(arg ?? action.value);
    const responseUrl: string | undefined = payload.response_url;
    const fromMessage = payload.container?.type === "message";

    switch (name) {
      case "lf_new":
        await openView(ws.token, payload.trigger_id, createFlyModal());
        break;
      case "lf_profile":
        await openView(ws.token, payload.trigger_id, profileModal(member));
        break;
      case "lf_refresh":
        after(() => refreshHome(member));
        break;
      case "lf_take": {
        const result = await takeSlot(id, member);
        after(async () => {
          if (result.ok) {
            if (fromMessage) {
              await respond(responseUrl, { replace_original: true, text: "✅ You took a slot — details are below." });
            }
            await onSlotTaken(result.assignmentId);
          } else {
            await tell(member, responseUrl, `🙈 ${result.reason}`);
            await refreshHome(member);
          }
        });
        break;
      }
      case "lf_pass":
        after(async () => {
          await setOfferResponse(id, member.id, "passed");
          await respond(responseUrl, { replace_original: true, text: "👋 Passed — we'll send you the next one." });
        });
        break;
      case "lf_done": {
        const assignment = await getAssignment(id);
        if (assignment && assignment.tester_member_id === member.id && !assignment.confirmed) {
          await openView(ws.token, payload.trigger_id, completeModal(assignment));
        }
        break;
      }
      case "lf_confirm5":
      case "lf_confirm3": {
        const rating = name === "lf_confirm5" ? 5 : 3;
        const confirmed = await confirmAssignment(id, member, rating);
        after(async () => {
          if (!confirmed) return tell(member, responseUrl, "This test was already confirmed, or isn't marked done yet.");
          if (fromMessage) {
            await respond(responseUrl, { replace_original: true, text: `✅ Confirmed — ${confirmed.credits} credits paid. Thanks for trading!` });
          }
          await onConfirmed(confirmed.id, rating);
        });
        break;
      }
      case "lf_reopen": {
        const reopened = await reopenAssignment(id, member);
        after(async () => {
          if (!reopened) return tell(member, responseUrl, "That test can't be reopened.");
          if (fromMessage) {
            await respond(responseUrl, { replace_original: true, text: "↩️ Sent back to the tester as not finished." });
          }
          await onReopened(id);
        });
        break;
      }
      case "lf_close":
        after(async () => {
          await closeFly(id, member);
          await refreshHome(member);
        });
        break;
    }
    return ok();
  }

  if (payload.type === "view_submission") {
    const view = payload.view;
    const values = view.state.values as Values;

    switch (view.callback_id) {
      case "lf_create": {
        const title = text(values, "title");
        const effortMinutes = Number(choice(values, "effort"));
        const slots = Number(choice(values, "slots"));
        if (!title) return fieldErrors({ title: "Add a short title." });
        if (!Number.isInteger(effortMinutes) || effortMinutes < 1 || effortMinutes > 600) {
          return fieldErrors({ effort: "Pick how long each test takes." });
        }
        if (!Number.isInteger(slots) || slots < 1 || slots > 10) return fieldErrors({ slots: "Pick 1–10 testers." });
        const cost = creditsForMinutes(effortMinutes);
        const balance = await balanceOf(member.id);
        if (balance < cost) {
          return fieldErrors({
            effort: `One tester costs ${cost} credits and you have ${balance}. Take someone's test to earn more, or pick a shorter test.`,
          });
        }
        const flyId = await createFly(member, {
          title,
          description: text(values, "description"),
          access: text(values, "access"),
          effortMinutes,
          slots,
          platforms: platformsFrom(values, "platforms"),
          circle: circleFrom(values, "circle"),
        });
        after(async () => {
          const offered = await dispatchOffers(flyId);
          await notify(member, {
            text: `Released: ${title}`,
            blocks: [{
              type: "section",
              text: {
                type: "mrkdwn",
                text: `🔦 *Released!* ${offered ? `We sent it to ${offered} founder${offered === 1 ? "" : "s"} who match.` : "It's listed for anyone who opens Lanternflies — we'll DM matches as more founders join."} You'll hear from us when someone takes a slot.`,
              },
            }],
          });
          await refreshHome(member);
        });
        return NextResponse.json({ response_action: "clear" });
      }

      case "lf_profile": {
        const updated = await updateProfile(member.id, {
          product: text(values, "product"),
          product_url: text(values, "product_url"),
          contact: text(values, "contact"),
          can_test: platformsFrom(values, "can_test"),
          circle: circleFrom(values, "circle"),
          offers_paused: choices(values, "paused").includes("paused"),
        });
        after(() => refreshHome(updated));
        return ok();
      }

      case "lf_complete": {
        const assignmentId = Number(view.private_metadata);
        const notes = text(values, "notes");
        if (!notes) return fieldErrors({ notes: "Tell them what you found." });
        const saved = await completeAssignment(assignmentId, member, notes, text(values, "results_url"));
        if (!saved) return fieldErrors({ notes: "This test was already confirmed." });
        after(() => onCompleted(assignmentId));
        return ok();
      }
    }
  }

  return ok();
}
