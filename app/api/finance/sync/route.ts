import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { SESSION_COOKIE, openSession } from "@/lib/session";
import { getSql } from "@/lib/db";
import { fetchAccounts, fetchTransactionsSince, mercuryConfigured } from "@/lib/finance/mercury";
import { FINANCE_CACHE_TAG } from "@/lib/finance/load";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Re-read this much history every run. Upserts are idempotent, so the overlap
// only costs a few requests and lets pending card charges settle into their
// final status and category.
const LOOKBACK_DAYS = 120;
const BUDGET_MS = 45_000;
const CHUNK = 200;

async function authorize(request: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth === `Bearer ${secret}`) return true;
  // Members can refresh by hand from the finance page.
  return Boolean(await openSession(request.cookies.get(SESSION_COOKIE)?.value));
}

export async function GET(request: NextRequest) {
  if (!(await authorize(request))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!mercuryConfigured()) return NextResponse.json({ error: "MERCURY_API_TOKEN is not set" }, { status: 503 });

  const deadline = Date.now() + BUDGET_MS;
  const sql = getSql();

  const accounts = await fetchAccounts();
  for (const a of accounts) {
    await sql`
      INSERT INTO mercury_accounts (id, name, kind, status, current_balance, available_balance, synced_at)
      VALUES (${a.id}, ${a.name}, ${a.kind}, ${a.status}, ${a.currentBalance}, ${a.availableBalance}, now())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, kind = EXCLUDED.kind, status = EXCLUDED.status,
        current_balance = EXCLUDED.current_balance, available_balance = EXCLUDED.available_balance,
        synced_at = now()
    `;
    await sql`INSERT INTO mercury_balance_snapshots (account_id, current_balance) VALUES (${a.id}, ${a.currentBalance})`;
  }

  const start = new Date(Date.now() - LOOKBACK_DAYS * 86400_000).toISOString().slice(0, 10);
  const txns = await fetchTransactionsSince(start, deadline);

  for (let i = 0; i < txns.length; i += CHUNK) {
    const chunk = txns.slice(i, i + CHUNK);
    await sql`
      INSERT INTO mercury_transactions
        (id, account_id, amount, status, kind, counterparty_name, mercury_category, category_name,
         note, bank_description, dashboard_link, created_at, posted_at, synced_at)
      SELECT * , now() FROM UNNEST(
        ${chunk.map((t) => t.id)}::text[],
        ${chunk.map((t) => t.accountId)}::text[],
        ${chunk.map((t) => t.amount)}::numeric[],
        ${chunk.map((t) => t.status)}::text[],
        ${chunk.map((t) => t.kind)}::text[],
        ${chunk.map((t) => t.counterpartyNickname || t.counterpartyName || "")}::text[],
        ${chunk.map((t) => t.mercuryCategory)}::text[],
        ${chunk.map((t) => t.categoryData?.name ?? null)}::text[],
        ${chunk.map((t) => t.note)}::text[],
        ${chunk.map((t) => t.bankDescription)}::text[],
        ${chunk.map((t) => t.dashboardLink ?? "")}::text[],
        ${chunk.map((t) => t.createdAt)}::timestamptz[],
        ${chunk.map((t) => t.postedAt)}::timestamptz[]
      )
      ON CONFLICT (id) DO UPDATE SET
        amount = EXCLUDED.amount, status = EXCLUDED.status, kind = EXCLUDED.kind,
        counterparty_name = EXCLUDED.counterparty_name, mercury_category = EXCLUDED.mercury_category,
        category_name = EXCLUDED.category_name, note = EXCLUDED.note,
        bank_description = EXCLUDED.bank_description, dashboard_link = EXCLUDED.dashboard_link,
        posted_at = EXCLUDED.posted_at, synced_at = now()
    `;
  }

  revalidateTag(FINANCE_CACHE_TAG);

  const body = { accounts: accounts.length, transactions: txns.length, since: start, ms: Date.now() - (deadline - BUDGET_MS) };
  // A member clicking "Refresh" on the page lands back on it; the cron gets JSON.
  if (request.headers.get("accept")?.includes("text/html")) {
    return NextResponse.redirect(new URL("/members/finance?synced=1", request.url));
  }
  return NextResponse.json(body);
}
