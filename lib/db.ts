import { neon } from "@neondatabase/serverless";

// Lazy so `next build` doesn't require DATABASE_URL at module-eval time.
let _sql: ReturnType<typeof neon> | null = null;

export function getSql() {
  if (!_sql) _sql = neon(process.env.DATABASE_URL!);
  return _sql;
}

export type Bootstrapper = {
  id: number;
  karma: number;
  bootstrapper: string;
  category: string;
  product: string;
  stage: string;
  hrs_wk: string;
  ask: string;
  notes: string;
};
