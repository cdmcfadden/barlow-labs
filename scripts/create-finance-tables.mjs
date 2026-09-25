import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);

await sql`CREATE TABLE IF NOT EXISTS mercury_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '',
  current_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  available_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`;

await sql`CREATE TABLE IF NOT EXISTS mercury_transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  status TEXT NOT NULL,
  kind TEXT NOT NULL,
  counterparty_name TEXT NOT NULL DEFAULT '',
  mercury_category TEXT,
  category_name TEXT,
  note TEXT,
  bank_description TEXT,
  dashboard_link TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL,
  posted_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`;
await sql`CREATE INDEX IF NOT EXISTS mercury_transactions_created_idx ON mercury_transactions (created_at)`;

// One row per account per sync, so the cash line on the page has history.
await sql`CREATE TABLE IF NOT EXISTS mercury_balance_snapshots (
  id SERIAL PRIMARY KEY,
  account_id TEXT NOT NULL,
  current_balance NUMERIC(14,2) NOT NULL,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`;
await sql`CREATE INDEX IF NOT EXISTS mercury_balance_snapshots_taken_idx ON mercury_balance_snapshots (taken_at)`;

console.log("finance tables ready");
