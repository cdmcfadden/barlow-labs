// One-time setup for the lanternfly testing marketplace.
// Run: node --env-file=.env.local scripts/create-lanternfly-tables.mjs
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

await sql`ALTER TABLE bootstrappers ADD COLUMN IF NOT EXISTS karma INT NOT NULL DEFAULT 10`;

await sql`
  CREATE TABLE IF NOT EXISTS lanternflies (
    id SERIAL PRIMARY KEY,
    builder_sub TEXT NOT NULL,
    builder_name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    effort_minutes INT NOT NULL,
    slots INT NOT NULL,
    access_directions TEXT NOT NULL DEFAULT '',
    credits INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS lanternfly_assignments (
    id SERIAL PRIMARY KEY,
    lanternfly_id INT NOT NULL REFERENCES lanternflies(id) ON DELETE CASCADE,
    tester_sub TEXT NOT NULL,
    tester_name TEXT NOT NULL,
    credits INT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'not_started',
    confirmed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (lanternfly_id, tester_sub)
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS lanternfly_files (
    id SERIAL PRIMARY KEY,
    assignment_id INT NOT NULL REFERENCES lanternfly_assignments(id) ON DELETE CASCADE,
    pathname TEXT NOT NULL,
    blob_url TEXT NOT NULL,
    filename TEXT NOT NULL,
    size BIGINT NOT NULL DEFAULT 0,
    uploaded_by TEXT NOT NULL DEFAULT '',
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

console.log("lanternfly tables ready");
