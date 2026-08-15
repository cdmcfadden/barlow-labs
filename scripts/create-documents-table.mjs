import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);
await sql`CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  pathname TEXT NOT NULL,
  blob_url TEXT NOT NULL,
  filename TEXT NOT NULL,
  size BIGINT NOT NULL DEFAULT 0,
  content_type TEXT NOT NULL DEFAULT '',
  uploaded_by TEXT NOT NULL DEFAULT '',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`;
console.log("documents table ready");
