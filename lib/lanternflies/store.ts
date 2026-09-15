import { getSql } from "@/lib/db";
import { WORKSPACES } from "@/lib/workspaces";
import { LF, creditsForMinutes } from "./config";
import { decryptToken, encryptToken } from "./crypto";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

/** Web lanternflies created before lf_members existed all came from Barlow Labs. */
export const LEGACY_TEAM = WORKSPACES[0].teamId;

export type Circle = "community" | "everyone";

export type Workspace = { team_id: string; team_name: string; bot_user_id: string; token: string };

export type Member = {
  id: number;
  team_id: string;
  user_id: string;
  name: string;
  product: string;
  product_url: string;
  contact: string;
  can_test: string[];
  circle: Circle;
  offers_paused: boolean;
};

export type Fly = {
  id: number;
  member_id: number | null;
  builder_sub: string;
  builder_name: string;
  builder_team: string;
  builder_team_name: string;
  title: string;
  description: string;
  access_directions: string;
  effort_minutes: number;
  slots: number;
  credits: number;
  platforms: string[];
  circle: Circle;
  status: string;
  taken: number;
};

export type Assignment = {
  id: number;
  lanternfly_id: number;
  tester_sub: string;
  tester_name: string;
  tester_member_id: number | null;
  credits: number;
  notes: string;
  status: string;
  confirmed: boolean;
  results_url: string;
  title: string;
  access_directions: string;
  builder_member_id: number | null;
  builder_name: string;
};

function toMember(r: Row): Member {
  return {
    id: r.id,
    team_id: r.team_id,
    user_id: r.user_id,
    name: r.name ?? "",
    product: r.product ?? "",
    product_url: r.product_url ?? "",
    contact: r.contact ?? "",
    can_test: r.can_test ?? [],
    circle: r.circle === "community" ? "community" : "everyone",
    offers_paused: Boolean(r.offers_paused),
  };
}

function toFly(r: Row): Fly {
  return { ...(r as Fly), platforms: r.platforms ?? [], circle: r.circle === "community" ? "community" : "everyone" };
}

// ── Workspaces ──────────────────────────────────────────────────────────────

export async function saveWorkspace(w: {
  teamId: string;
  teamName: string;
  botUserId: string;
  token: string;
  installedBy: string;
}) {
  await getSql()`
    INSERT INTO lf_workspaces (team_id, team_name, bot_user_id, bot_token_enc, installed_by)
    VALUES (${w.teamId}, ${w.teamName}, ${w.botUserId}, ${encryptToken(w.token)}, ${w.installedBy})
    ON CONFLICT (team_id) DO UPDATE SET
      team_name = EXCLUDED.team_name, bot_user_id = EXCLUDED.bot_user_id,
      bot_token_enc = EXCLUDED.bot_token_enc, installed_by = EXCLUDED.installed_by,
      installed_at = now(), uninstalled_at = NULL
  `;
}

export async function getWorkspace(teamId: string | undefined): Promise<Workspace | null> {
  if (!teamId) return null;
  const rows = (await getSql()`
    SELECT team_id, team_name, bot_user_id, bot_token_enc FROM lf_workspaces
    WHERE team_id = ${teamId} AND uninstalled_at IS NULL
  `) as Row[];
  const r = rows[0];
  if (!r) return null;
  return { team_id: r.team_id, team_name: r.team_name, bot_user_id: r.bot_user_id, token: decryptToken(r.bot_token_enc) };
}

export async function markUninstalled(teamId: string) {
  await getSql()`UPDATE lf_workspaces SET uninstalled_at = now() WHERE team_id = ${teamId}`;
}

// ── Members & credits ───────────────────────────────────────────────────────

/** Finds or creates a member; new members get the welcome grant exactly once. */
export async function ensureMember(
  teamId: string,
  userId: string,
  name = ""
): Promise<{ member: Member; created: boolean }> {
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO lf_members (team_id, user_id, name) VALUES (${teamId}, ${userId}, ${name})
    ON CONFLICT (team_id, user_id) DO UPDATE
      SET name = CASE WHEN EXCLUDED.name <> '' THEN EXCLUDED.name ELSE lf_members.name END
    RETURNING id, team_id, user_id, name, product, product_url, contact, can_test, circle,
              offers_paused, (xmax = 0) AS created
  `) as Row[];
  const r = rows[0];
  if (r.created) {
    await sql`
      INSERT INTO lf_ledger (member_id, delta, reason) VALUES (${r.id}, ${LF.welcomeCredits}, 'welcome')
      ON CONFLICT DO NOTHING
    `;
  }
  return { member: toMember(r), created: Boolean(r.created) };
}

export async function getMember(teamId: string, userId: string): Promise<Member | null> {
  const rows = (await getSql()`
    SELECT * FROM lf_members WHERE team_id = ${teamId} AND user_id = ${userId}
  `) as Row[];
  return rows[0] ? toMember(rows[0]) : null;
}

export async function memberById(id: number | null | undefined): Promise<Member | null> {
  if (!id) return null;
  const rows = (await getSql()`SELECT * FROM lf_members WHERE id = ${id}`) as Row[];
  return rows[0] ? toMember(rows[0]) : null;
}

export async function balanceOf(memberId: number): Promise<number> {
  const rows = (await getSql()`
    SELECT COALESCE(sum(delta), 0)::int AS balance FROM lf_ledger WHERE member_id = ${memberId}
  `) as Row[];
  return rows[0].balance;
}

export async function updateProfile(
  memberId: number,
  p: Pick<Member, "product" | "product_url" | "contact" | "can_test" | "circle" | "offers_paused">
): Promise<Member> {
  const rows = (await getSql()`
    UPDATE lf_members SET product = ${p.product}, product_url = ${p.product_url}, contact = ${p.contact},
      can_test = ${p.can_test}, circle = ${p.circle}, offers_paused = ${p.offers_paused}
    WHERE id = ${memberId} RETURNING *
  `) as Row[];
  return toMember(rows[0]);
}

// ── Lanternflies (test requests) ────────────────────────────────────────────

export type NewFly = {
  title: string;
  description: string;
  access: string;
  effortMinutes: number;
  slots: number;
  platforms: string[];
  circle: Circle;
};

export async function createFly(builder: Member, f: NewFly): Promise<number> {
  const rows = (await getSql()`
    INSERT INTO lanternflies
      (builder_sub, builder_name, title, description, effort_minutes, slots, access_directions,
       credits, member_id, platforms, circle, status)
    VALUES
      (${builder.user_id}, ${builder.name}, ${f.title}, ${f.description}, ${f.effortMinutes}, ${f.slots},
       ${f.access}, ${creditsForMinutes(f.effortMinutes)}, ${builder.id}, ${f.platforms}, ${f.circle}, 'open')
    RETURNING id
  `) as Row[];
  return rows[0].id;
}

export async function getFly(id: number): Promise<Fly | null> {
  const rows = (await getSql()`
    SELECT f.id, f.member_id, f.builder_sub, f.builder_name,
           COALESCE(m.team_id, ${LEGACY_TEAM}) AS builder_team, COALESCE(w.team_name, '') AS builder_team_name,
           f.title, f.description, f.access_directions, f.effort_minutes, f.slots, f.credits,
           f.platforms, f.circle, f.status,
           (SELECT count(*)::int FROM lanternfly_assignments a WHERE a.lanternfly_id = f.id) AS taken
    FROM lanternflies f
    LEFT JOIN lf_members m ON m.id = f.member_id
    LEFT JOIN lf_workspaces w ON w.team_id = COALESCE(m.team_id, ${LEGACY_TEAM})
    WHERE f.id = ${id}
  `) as Row[];
  return rows[0] ? toFly(rows[0]) : null;
}

/** Open requests this member may take: not theirs, not full, and inside both sides' circles. */
export async function openFliesFor(member: Member, limit = 8): Promise<Fly[]> {
  const rows = (await getSql()`
    SELECT f.id, f.member_id, f.builder_sub, f.builder_name,
           COALESCE(m.team_id, ${LEGACY_TEAM}) AS builder_team, COALESCE(w.team_name, '') AS builder_team_name,
           f.title, f.description, f.access_directions, f.effort_minutes, f.slots, f.credits,
           f.platforms, f.circle, f.status,
           (SELECT count(*)::int FROM lanternfly_assignments a WHERE a.lanternfly_id = f.id) AS taken
    FROM lanternflies f
    LEFT JOIN lf_members m ON m.id = f.member_id
    LEFT JOIN lf_workspaces w ON w.team_id = COALESCE(m.team_id, ${LEGACY_TEAM})
    WHERE f.status = 'open'
      AND f.builder_sub <> ${member.user_id}
      AND (SELECT count(*) FROM lanternfly_assignments a WHERE a.lanternfly_id = f.id) < f.slots
      AND NOT EXISTS (
        SELECT 1 FROM lanternfly_assignments a WHERE a.lanternfly_id = f.id AND a.tester_sub = ${member.user_id}
      )
      AND (COALESCE(m.team_id, ${LEGACY_TEAM}) = ${member.team_id}
           OR (f.circle = 'everyone' AND ${member.circle} = 'everyone'))
    ORDER BY f.created_at DESC
    LIMIT ${limit}
  `) as Row[];
  return rows.map(toFly);
}

export async function myOpenFlies(member: Member): Promise<Fly[]> {
  const rows = (await getSql()`
    SELECT f.id, f.member_id, f.builder_sub, f.builder_name, ${member.team_id} AS builder_team,
           '' AS builder_team_name, f.title, f.description, f.access_directions, f.effort_minutes,
           f.slots, f.credits, f.platforms, f.circle, f.status,
           (SELECT count(*)::int FROM lanternfly_assignments a WHERE a.lanternfly_id = f.id) AS taken
    FROM lanternflies f
    WHERE f.member_id = ${member.id} AND f.status = 'open'
    ORDER BY f.created_at DESC LIMIT 10
  `) as Row[];
  return rows.map(toFly);
}

export async function closeFly(id: number, builder: Member): Promise<boolean> {
  const rows = (await getSql()`
    UPDATE lanternflies SET status = 'closed' WHERE id = ${id} AND member_id = ${builder.id} RETURNING id
  `) as Row[];
  return rows.length > 0;
}

// ── Assignments (a tester's slot on a request) ──────────────────────────────

export async function takeSlot(
  flyId: number,
  tester: Member
): Promise<{ ok: true; assignmentId: number } | { ok: false; reason: string }> {
  const sql = getSql();
  const fly = await getFly(flyId);
  if (!fly || fly.status !== "open") return { ok: false, reason: "That request is closed." };
  if (fly.member_id === tester.id || fly.builder_sub === tester.user_id) {
    return { ok: false, reason: "You can't test your own request." };
  }
  const rows = (await sql`
    INSERT INTO lanternfly_assignments (lanternfly_id, tester_sub, tester_name, credits, tester_member_id)
    SELECT f.id, ${tester.user_id}, ${tester.name}, f.credits, ${tester.id}
    FROM lanternflies f
    WHERE f.id = ${flyId} AND f.status = 'open'
      AND (SELECT count(*) FROM lanternfly_assignments a WHERE a.lanternfly_id = f.id) < f.slots
    ON CONFLICT (lanternfly_id, tester_sub) DO NOTHING
    RETURNING id
  `) as Row[];
  if (rows[0]) return { ok: true, assignmentId: rows[0].id };
  const mine = (await sql`
    SELECT 1 FROM lanternfly_assignments WHERE lanternfly_id = ${flyId} AND tester_sub = ${tester.user_id}
  `) as Row[];
  return { ok: false, reason: mine.length ? "You already have a slot on this one." : "All slots were just taken." };
}

export async function getAssignment(id: number): Promise<Assignment | null> {
  const rows = (await getSql()`
    SELECT a.id, a.lanternfly_id, a.tester_sub, a.tester_name, a.tester_member_id, a.credits, a.notes,
           a.status, a.confirmed, a.results_url, f.title, f.access_directions,
           f.member_id AS builder_member_id, f.builder_name
    FROM lanternfly_assignments a JOIN lanternflies f ON f.id = a.lanternfly_id
    WHERE a.id = ${id}
  `) as Row[];
  return (rows[0] as Assignment) ?? null;
}

/** Unconfirmed tests this member is doing. */
export async function testsFor(member: Member): Promise<Assignment[]> {
  return (await getSql()`
    SELECT a.id, a.lanternfly_id, a.tester_sub, a.tester_name, a.tester_member_id, a.credits, a.notes,
           a.status, a.confirmed, a.results_url, f.title, f.access_directions,
           f.member_id AS builder_member_id, f.builder_name
    FROM lanternfly_assignments a JOIN lanternflies f ON f.id = a.lanternfly_id
    WHERE a.tester_member_id = ${member.id} AND a.confirmed = false
    ORDER BY a.created_at DESC LIMIT 10
  `) as Assignment[];
}

/** Unconfirmed tests on this member's requests. */
export async function reviewsFor(member: Member): Promise<Assignment[]> {
  return (await getSql()`
    SELECT a.id, a.lanternfly_id, a.tester_sub, a.tester_name, a.tester_member_id, a.credits, a.notes,
           a.status, a.confirmed, a.results_url, f.title, f.access_directions,
           f.member_id AS builder_member_id, f.builder_name
    FROM lanternfly_assignments a JOIN lanternflies f ON f.id = a.lanternfly_id
    WHERE f.member_id = ${member.id} AND a.confirmed = false
    ORDER BY (a.status = 'completed') DESC, a.created_at DESC LIMIT 10
  `) as Assignment[];
}

export async function completeAssignment(
  id: number,
  tester: Member,
  notes: string,
  resultsUrl: string
): Promise<boolean> {
  const rows = (await getSql()`
    UPDATE lanternfly_assignments
    SET status = 'completed', completed_at = now(), notes = ${notes}, results_url = ${resultsUrl}
    WHERE id = ${id} AND tester_member_id = ${tester.id} AND confirmed = false
    RETURNING id
  `) as Row[];
  return rows.length > 0;
}

/** Builder says it isn't finished: back to in-progress so the tester can resubmit. */
export async function reopenAssignment(id: number, builder: Member): Promise<boolean> {
  const rows = (await getSql()`
    UPDATE lanternfly_assignments a SET status = 'in_process', completed_at = NULL
    FROM lanternflies f
    WHERE a.id = ${id} AND a.lanternfly_id = f.id AND f.member_id = ${builder.id}
      AND a.confirmed = false AND a.status = 'completed'
    RETURNING a.id
  `) as Row[];
  return rows.length > 0;
}

/**
 * Confirms a completed test and moves the credits in one statement: the
 * update only matches an unconfirmed, completed row, and the ledger rows are
 * unique per (member, reason, assignment), so a double-click can't pay twice.
 */
export async function confirmAssignment(
  id: number,
  builder: Member,
  rating: number
): Promise<{ id: number; credits: number; tester_member_id: number } | null> {
  const rows = (await getSql()`
    WITH done AS (
      UPDATE lanternfly_assignments a
      SET confirmed = true, confirmed_at = now(), rating = ${rating}
      FROM lanternflies f
      WHERE a.id = ${id} AND a.lanternfly_id = f.id AND f.member_id = ${builder.id}
        AND a.status = 'completed' AND a.confirmed = false AND a.tester_member_id IS NOT NULL
      RETURNING a.id, a.credits, a.tester_member_id, f.member_id AS builder_member_id
    ), paid AS (
      INSERT INTO lf_ledger (member_id, delta, reason, assignment_id)
      SELECT builder_member_id, -credits, 'test_paid', id FROM done
      UNION ALL
      SELECT tester_member_id, credits, 'test_earned', id FROM done
      ON CONFLICT DO NOTHING
      RETURNING 1
    )
    SELECT d.id, d.credits, d.tester_member_id, (SELECT count(*) FROM paid) AS ledger_rows FROM done d
  `) as Row[];
  return rows[0] ? { id: rows[0].id, credits: rows[0].credits, tester_member_id: rows[0].tester_member_id } : null;
}

// ── Matching offers ─────────────────────────────────────────────────────────

/**
 * Who to DM about a new request. Eligible: installed workspace, not paused,
 * not the builder, not already offered or testing it, inside both circles,
 * and able to test on one of its platforms. Ranked so the people most likely
 * to say yes come first: founders with their own open request (they need
 * credits), then the lowest balances, then whoever was offered longest ago.
 */
export async function offerCandidates(fly: Fly, limit: number): Promise<Member[]> {
  const rows = (await getSql()`
    SELECT m.* FROM lf_members m
    JOIN lf_workspaces w ON w.team_id = m.team_id AND w.uninstalled_at IS NULL
    WHERE m.id IS DISTINCT FROM ${fly.member_id}
      AND m.user_id <> ${fly.builder_sub}
      AND NOT m.offers_paused
      AND NOT EXISTS (SELECT 1 FROM lf_offers o WHERE o.lanternfly_id = ${fly.id} AND o.member_id = m.id)
      AND NOT EXISTS (
        SELECT 1 FROM lanternfly_assignments a WHERE a.lanternfly_id = ${fly.id} AND a.tester_sub = m.user_id
      )
      AND (m.team_id = ${fly.builder_team} OR (${fly.circle} = 'everyone' AND m.circle = 'everyone'))
      AND (cardinality(${fly.platforms}::text[]) = 0 OR cardinality(m.can_test) = 0
           OR m.can_test && ${fly.platforms}::text[])
    ORDER BY
      EXISTS (SELECT 1 FROM lanternflies f2 WHERE f2.member_id = m.id AND f2.status = 'open') DESC,
      (SELECT COALESCE(sum(l.delta), 0) FROM lf_ledger l WHERE l.member_id = m.id) ASC,
      m.last_offer_at ASC NULLS FIRST
    LIMIT ${limit}
  `) as Row[];
  return rows.map(toMember);
}

export async function recordOffer(flyId: number, memberId: number, channel: string, ts: string) {
  const sql = getSql();
  await sql`
    INSERT INTO lf_offers (lanternfly_id, member_id, channel, ts) VALUES (${flyId}, ${memberId}, ${channel}, ${ts})
    ON CONFLICT (lanternfly_id, member_id) DO NOTHING
  `;
  await sql`UPDATE lf_members SET last_offer_at = now() WHERE id = ${memberId}`;
}

export async function setOfferResponse(flyId: number, memberId: number, response: string) {
  await getSql()`
    UPDATE lf_offers SET response = ${response} WHERE lanternfly_id = ${flyId} AND member_id = ${memberId}
  `;
}

export async function pendingOffers(flyId: number) {
  return (await getSql()`
    SELECT o.member_id, m.team_id, o.channel, o.ts FROM lf_offers o JOIN lf_members m ON m.id = o.member_id
    WHERE o.lanternfly_id = ${flyId} AND o.response = 'pending'
  `) as { member_id: number; team_id: string; channel: string; ts: string }[];
}
