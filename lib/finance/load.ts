import { unstable_cache } from "next/cache";
import { getSql } from "@/lib/db";
import { mercuryConfigured } from "./mercury";

export const FINANCE_CACHE_TAG = "finance";
const HOUR = 3600;

export type TxnRow = {
  id: string;
  account_id: string;
  amount: number;
  status: string;
  kind: string;
  counterparty_name: string;
  mercury_category: string | null;
  category_name: string | null;
  note: string | null;
  bank_description: string | null;
  dashboard_link: string;
  created_at: string;
  posted_at: string | null;
};

export type AccountRow = {
  id: string;
  name: string;
  kind: string;
  status: string;
  current_balance: number;
  available_balance: number;
  synced_at: string;
};

export type SnapshotRow = { account_id: string; current_balance: number; taken_at: string };

export type FinanceData = {
  accounts: AccountRow[];
  transactions: TxnRow[];
  snapshots: SnapshotRow[];
  lastSync: string | null;
};

const num = (v: unknown) => Number(v ?? 0);

async function readFinance(): Promise<FinanceData> {
  const sql = getSql();
  const [accounts, transactions, snapshots] = (await Promise.all([
    sql`SELECT * FROM mercury_accounts WHERE status = 'active' ORDER BY name`,
    sql`SELECT * FROM mercury_transactions WHERE created_at > now() - interval '120 days' ORDER BY created_at DESC`,
    sql`
      SELECT account_id, current_balance, taken_at FROM mercury_balance_snapshots
      WHERE taken_at > now() - interval '120 days' ORDER BY taken_at
    `,
  ])) as [Record<string, unknown>[], Record<string, unknown>[], Record<string, unknown>[]];

  return {
    accounts: accounts.map((a) => ({
      ...(a as AccountRow),
      current_balance: num(a.current_balance),
      available_balance: num(a.available_balance),
    })),
    transactions: transactions.map((t) => ({ ...(t as TxnRow), amount: num(t.amount) })),
    snapshots: snapshots.map((s) => ({ ...(s as SnapshotRow), current_balance: num(s.current_balance) })),
    lastSync: accounts.length ? String(accounts[0].synced_at) : null,
  };
}

const cached = unstable_cache(async () => ({ at: Date.now(), data: await readFinance() }), ["finance-v1"], {
  revalidate: HOUR,
  tags: [FINANCE_CACHE_TAG],
});

export type Source = { data: FinanceData | null; at: number | null; error: string | null; configured: boolean };

export async function loadFinance(): Promise<Source> {
  const configured = mercuryConfigured();
  try {
    const { at, data } = await cached();
    return { data, at, error: null, configured };
  } catch (e) {
    return { data: null, at: null, error: e instanceof Error ? e.message : String(e), configured };
  }
}
