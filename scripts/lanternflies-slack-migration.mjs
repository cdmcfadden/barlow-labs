// Lanternflies as a multi-workspace Slack app. Additive and idempotent: safe to re-run.
// Run: node --env-file=.env.local scripts/lanternflies-slack-migration.mjs
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const LEGACY_TEAM = process.env.SLACK_TEAM_ID || "T08UF8ML4P9"; // web lanternflies all came from Barlow Labs
const WELCOME_CREDITS = 3;

await sql`
  CREATE TABLE IF NOT EXISTS lf_workspaces (
    team_id TEXT PRIMARY KEY,
    team_name TEXT NOT NULL,
    bot_user_id TEXT NOT NULL,
    bot_token_enc TEXT NOT NULL,
    installed_by TEXT NOT NULL,
    installed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    uninstalled_at TIMESTAMPTZ
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS lf_members (
    id SERIAL PRIMARY KEY,
    team_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    product TEXT NOT NULL DEFAULT '',
    product_url TEXT NOT NULL DEFAULT '',
    contact TEXT NOT NULL DEFAULT '',
    can_test TEXT[] NOT NULL DEFAULT '{}',
    circle TEXT NOT NULL DEFAULT 'everyone',
    offers_paused BOOLEAN NOT NULL DEFAULT false,
    last_offer_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (team_id, user_id)
  )
`;

// Balances are the sum of this ledger; nothing else stores a balance.
await sql`
  CREATE TABLE IF NOT EXISTS lf_ledger (
    id SERIAL PRIMARY KEY,
    member_id INT NOT NULL REFERENCES lf_members(id),
    delta INT NOT NULL,
    reason TEXT NOT NULL,
    assignment_id INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (member_id, reason, assignment_id)
  )
`;
// UNIQUE above ignores NULL assignment ids, so welcome grants need their own guard.
await sql`CREATE UNIQUE INDEX IF NOT EXISTS lf_ledger_one_welcome ON lf_ledger (member_id) WHERE reason = 'welcome'`;

await sql`ALTER TABLE lanternflies ADD COLUMN IF NOT EXISTS member_id INT REFERENCES lf_members(id)`;
await sql`ALTER TABLE lanternflies ADD COLUMN IF NOT EXISTS platforms TEXT[] NOT NULL DEFAULT '{}'`;
await sql`ALTER TABLE lanternflies ADD COLUMN IF NOT EXISTS circle TEXT NOT NULL DEFAULT 'everyone'`;
await sql`ALTER TABLE lanternflies ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open'`;

await sql`ALTER TABLE lanternfly_assignments ADD COLUMN IF NOT EXISTS tester_member_id INT REFERENCES lf_members(id)`;
await sql`ALTER TABLE lanternfly_assignments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ`;
await sql`ALTER TABLE lanternfly_assignments ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ`;
await sql`ALTER TABLE lanternfly_assignments ADD COLUMN IF NOT EXISTS rating INT`;
await sql`ALTER TABLE lanternfly_assignments ADD COLUMN IF NOT EXISTS results_url TEXT NOT NULL DEFAULT ''`;

await sql`
  CREATE TABLE IF NOT EXISTS lf_offers (
    id SERIAL PRIMARY KEY,
    lanternfly_id INT NOT NULL REFERENCES lanternflies(id) ON DELETE CASCADE,
    member_id INT NOT NULL REFERENCES lf_members(id),
    channel TEXT NOT NULL DEFAULT '',
    ts TEXT NOT NULL DEFAULT '',
    response TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (lanternfly_id, member_id)
  )
`;

// Backfill members for everyone already in the web marketplace, then link their rows.
const people = await sql`
  SELECT builder_sub AS user_id, builder_name AS name FROM lanternflies
  UNION
  SELECT tester_sub, tester_name FROM lanternfly_assignments
`;
for (const person of people) {
  const [member] = await sql`
    INSERT INTO lf_members (team_id, user_id, name) VALUES (${LEGACY_TEAM}, ${person.user_id}, ${person.name})
    ON CONFLICT (team_id, user_id) DO UPDATE SET name = lf_members.name
    RETURNING id
  `;
  await sql`
    INSERT INTO lf_ledger (member_id, delta, reason) VALUES (${member.id}, ${WELCOME_CREDITS}, 'welcome')
    ON CONFLICT DO NOTHING
  `;
}
await sql`
  UPDATE lanternflies f SET member_id = m.id FROM lf_members m
  WHERE f.member_id IS NULL AND m.team_id = ${LEGACY_TEAM} AND m.user_id = f.builder_sub
`;
await sql`
  UPDATE lanternfly_assignments a SET tester_member_id = m.id FROM lf_members m
  WHERE a.tester_member_id IS NULL AND m.team_id = ${LEGACY_TEAM} AND m.user_id = a.tester_sub
`;

const [counts] = await sql`
  SELECT (SELECT count(*) FROM lf_members)::int AS members,
         (SELECT count(*) FROM lanternflies WHERE member_id IS NULL)::int AS unlinked_flies,
         (SELECT count(*) FROM lanternfly_assignments WHERE tester_member_id IS NULL)::int AS unlinked_assignments
`;
console.log("lanternflies slack migration done", counts);
