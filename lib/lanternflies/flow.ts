import { LF } from "./config";
import {
  builderReview,
  builderSlotTaken,
  homeView,
  offerClosedMessage,
  offerMessage,
  testerIntro,
  testerPaid,
  testerReopened,
  welcomeMessage,
} from "./blocks";
import { dm, publishHome, slackName, updateMessage } from "./slackApi";
import {
  balanceOf,
  ensureMember,
  getAssignment,
  getFly,
  getMember,
  getWorkspace,
  memberById,
  myOpenFlies,
  offerCandidates,
  openFliesFor,
  pendingOffers,
  recordOffer,
  reviewsFor,
  setOfferResponse,
  testsFor,
  type Member,
  type Workspace,
} from "./store";

// Side effects that follow a state change: DMs and Home refreshes. Each person
// is always reached through their own workspace's installation, which is what
// makes matching across workspaces work. Failures are logged, never thrown —
// the state change already happened and a missed DM shouldn't undo it.

const log = (...args: unknown[]) => console.error("[lanternflies]", ...args);

type Message = { text: string; blocks: unknown[] };
type Lookup = (teamId: string) => Promise<Workspace | null>;

function workspaceLookup(): Lookup {
  const cache = new Map<string, Promise<Workspace | null>>();
  return (teamId) => {
    let found = cache.get(teamId);
    if (!found) {
      found = getWorkspace(teamId);
      cache.set(teamId, found);
    }
    return found;
  };
}

export async function notify(member: Member | null, message: Message, lookup: Lookup = workspaceLookup()) {
  if (!member) return null;
  const ws = await lookup(member.team_id);
  if (!ws) return null;
  try {
    return await dm(ws.token, member.user_id, message.text, message.blocks);
  } catch (error) {
    log("dm failed", member.team_id, member.user_id, error);
    return null;
  }
}

export async function memberFromSlack(ws: Workspace, userId: string) {
  const existing = await getMember(ws.team_id, userId);
  if (existing) return { member: existing, created: false };
  return ensureMember(ws.team_id, userId, await slackName(ws.token, userId));
}

export async function welcome(member: Member) {
  await notify(member, welcomeMessage(await balanceOf(member.id)));
}

export async function refreshHome(member: Member | null) {
  if (!member) return;
  const ws = await getWorkspace(member.team_id);
  if (!ws) return;
  const [balance, open, myFlies, reviews, tests] = await Promise.all([
    balanceOf(member.id),
    openFliesFor(member),
    myOpenFlies(member),
    reviewsFor(member),
    testsFor(member),
  ]);
  try {
    await publishHome(ws.token, member.user_id, homeView({ member, balance, workspaceName: ws.team_name, open, myFlies, reviews, tests }));
  } catch (error) {
    log("views.publish failed", member.team_id, member.user_id, error);
  }
}

/** DMs the best-matched founders about a new request. Returns how many were offered. */
export async function dispatchOffers(flyId: number): Promise<number> {
  const fly = await getFly(flyId);
  if (!fly || fly.status !== "open" || fly.taken >= fly.slots) return 0;
  const candidates = await offerCandidates(fly, Math.min(LF.maxOffersPerFly, fly.slots * LF.offersPerSlot));
  const lookup = workspaceLookup();
  let sent = 0;
  for (const candidate of candidates) {
    const posted = await notify(candidate, offerMessage(fly), lookup);
    if (posted) {
      await recordOffer(fly.id, candidate.id, posted.channel, posted.ts);
      sent++;
    }
  }
  return sent;
}

export async function onSlotTaken(assignmentId: number) {
  const a = await getAssignment(assignmentId);
  const fly = a && (await getFly(a.lanternfly_id));
  if (!a || !fly) return;
  const [tester, builder] = await Promise.all([memberById(a.tester_member_id), memberById(a.builder_member_id)]);
  const lookup = workspaceLookup();
  const testerTeamName = tester ? ((await lookup(tester.team_id))?.team_name ?? "") : "";

  await notify(tester, testerIntro(a, fly, builder), lookup);
  await notify(builder, builderSlotTaken(a, fly, tester, testerTeamName), lookup);
  if (tester) await setOfferResponse(fly.id, tester.id, "accepted");

  // Full: take the buttons off everyone else's offer so nobody chases a dead slot.
  if (fly.taken >= fly.slots) {
    const closed = offerClosedMessage(fly, "✅ All slots are filled — we'll send you the next one.");
    for (const offer of await pendingOffers(fly.id)) {
      const ws = await lookup(offer.team_id);
      if (ws && offer.channel && offer.ts) {
        await updateMessage(ws.token, offer.channel, offer.ts, closed.text, closed.blocks).catch((e) => log("offer update failed", e));
      }
      await setOfferResponse(fly.id, offer.member_id, "expired");
    }
  }
  await Promise.all([refreshHome(tester), refreshHome(builder)]);
}

export async function onCompleted(assignmentId: number) {
  const a = await getAssignment(assignmentId);
  if (!a) return;
  const [tester, builder] = await Promise.all([memberById(a.tester_member_id), memberById(a.builder_member_id)]);
  await notify(builder, builderReview(a));
  await Promise.all([refreshHome(tester), refreshHome(builder)]);
}

export async function onConfirmed(assignmentId: number, rating: number) {
  const a = await getAssignment(assignmentId);
  if (!a) return;
  const [tester, builder] = await Promise.all([memberById(a.tester_member_id), memberById(a.builder_member_id)]);
  if (tester) await notify(tester, testerPaid(a, await balanceOf(tester.id), rating));
  await Promise.all([refreshHome(tester), refreshHome(builder)]);
}

export async function onReopened(assignmentId: number) {
  const a = await getAssignment(assignmentId);
  if (!a) return;
  const [tester, builder] = await Promise.all([memberById(a.tester_member_id), memberById(a.builder_member_id)]);
  await notify(tester, testerReopened(a));
  await Promise.all([refreshHome(tester), refreshHome(builder)]);
}
