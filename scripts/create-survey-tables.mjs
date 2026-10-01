import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);
await sql`CREATE TABLE IF NOT EXISTS survey_responses (
  id SERIAL PRIMARY KEY,
  survey_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  answers JSONB NOT NULL,
  user_agent TEXT NOT NULL DEFAULT '',
  notified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`;
await sql`CREATE INDEX IF NOT EXISTS survey_responses_slug_idx ON survey_responses (survey_slug, created_at DESC)`;
console.log("survey_responses table ready");
