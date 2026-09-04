// Creates the Slack archive tables. Safe to re-run.
//   DATABASE_URL=... node scripts/create-archive-tables.mjs
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

await sql`CREATE TABLE IF NOT EXISTS archive_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  real_name TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT '',
  is_bot BOOLEAN NOT NULL DEFAULT false,
  deleted BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`;

await sql`CREATE TABLE IF NOT EXISTS archive_channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT '',
  topic TEXT NOT NULL DEFAULT '',
  is_private BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  -- Highest message ts we have durably stored; the next sync resumes here.
  synced_through_ts TEXT NOT NULL DEFAULT '0',
  -- Set while a page-by-page backfill of an older window is in flight.
  sync_cursor TEXT,
  sync_window_start TEXT,
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  message_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`;

await sql`CREATE TABLE IF NOT EXISTS archive_messages (
  channel_id TEXT NOT NULL,
  ts TEXT NOT NULL,
  thread_ts TEXT,
  user_id TEXT NOT NULL DEFAULT '',
  user_name TEXT NOT NULL DEFAULT '',
  subtype TEXT NOT NULL DEFAULT '',
  text TEXT NOT NULL DEFAULT '',
  reactions JSONB NOT NULL DEFAULT '[]'::jsonb,
  reply_count INTEGER NOT NULL DEFAULT 0,
  posted_at TIMESTAMPTZ NOT NULL,
  edited_at TIMESTAMPTZ,
  permalink TEXT NOT NULL DEFAULT '',
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, ts)
)`;

await sql`ALTER TABLE archive_messages
  ADD COLUMN IF NOT EXISTS search tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(user_name, '') || ' ' || coalesce(text, ''))) STORED`;

await sql`CREATE INDEX IF NOT EXISTS archive_messages_search_idx ON archive_messages USING GIN (search)`;
await sql`CREATE INDEX IF NOT EXISTS archive_messages_posted_idx ON archive_messages (posted_at DESC)`;
await sql`CREATE INDEX IF NOT EXISTS archive_messages_channel_posted_idx ON archive_messages (channel_id, posted_at)`;
await sql`CREATE INDEX IF NOT EXISTS archive_messages_thread_idx ON archive_messages (channel_id, thread_ts)`;

await sql`CREATE TABLE IF NOT EXISTS archive_files (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  message_ts TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  mimetype TEXT NOT NULL DEFAULT '',
  size BIGINT NOT NULL DEFAULT 0,
  blob_url TEXT NOT NULL DEFAULT '',
  slack_permalink TEXT NOT NULL DEFAULT '',
  mirrored BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`;
await sql`ALTER TABLE archive_files ADD COLUMN IF NOT EXISTS blob_pathname TEXT NOT NULL DEFAULT ''`;
await sql`CREATE INDEX IF NOT EXISTS archive_files_message_idx ON archive_files (channel_id, message_ts)`;

await sql`CREATE TABLE IF NOT EXISTS archive_summaries (
  channel_id TEXT NOT NULL,
  month TEXT NOT NULL,
  summary TEXT NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  model TEXT NOT NULL DEFAULT '',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, month)
)`;

// Multi-workspace: rows written before the F3 workspace existed are Barlow's.
const BARLOW_TEAM = process.env.SLACK_TEAM_ID || "T08UF8ML4P9";
await sql`ALTER TABLE archive_channels ADD COLUMN IF NOT EXISTS team_id TEXT NOT NULL DEFAULT ''`;
await sql`ALTER TABLE archive_users ADD COLUMN IF NOT EXISTS team_id TEXT NOT NULL DEFAULT ''`;
await sql`UPDATE archive_channels SET team_id = ${BARLOW_TEAM} WHERE team_id = ''`;
await sql`UPDATE archive_users SET team_id = ${BARLOW_TEAM} WHERE team_id = ''`;
await sql`CREATE INDEX IF NOT EXISTS archive_channels_team_idx ON archive_channels (team_id)`;
await sql`CREATE INDEX IF NOT EXISTS archive_users_team_idx ON archive_users (team_id)`;

// Channel names repeat across workspaces, so the archive's URLs key on
// (team, name) rather than name alone.
await sql`CREATE UNIQUE INDEX IF NOT EXISTS archive_channels_team_name_idx ON archive_channels (team_id, name)`;

console.log("archive tables ready");
