// Reads the Mercury bank API. Needs a Read Only token (Mercury dashboard →
// Settings → Tokens); read-only tokens need no IP allowlist, which suits a
// Vercel function with no fixed egress address.

const BASE = "https://api.mercury.com/api/v1";

export type MercuryAccount = {
  id: string;
  name: string;
  kind: string;
  type: "mercury" | "external" | "recipient";
  currentBalance: number;
  availableBalance: number;
  status: "active" | "deleted" | "pending" | "archived";
};

export type MercuryTransaction = {
  id: string;
  accountId: string;
  /** Debits are negative, credits positive. */
  amount: number;
  status: "pending" | "sent" | "cancelled" | "failed" | "reversed" | "blocked";
  kind: string;
  counterpartyId: string;
  counterpartyName: string;
  counterpartyNickname: string | null;
  createdAt: string;
  postedAt: string | null;
  categoryData: { id: string; name: string } | null;
  mercuryCategory: string | null;
  cardId: string | null;
  note: string | null;
  externalMemo: string | null;
  bankDescription: string | null;
  dashboardLink: string;
};

export function mercuryConfigured(): boolean {
  return Boolean(process.env.MERCURY_API_TOKEN);
}

async function get<T>(path: string, params: Record<string, string | string[] | undefined> = {}): Promise<T> {
  const token = process.env.MERCURY_API_TOKEN;
  if (!token) throw new Error("MERCURY_API_TOKEN is not set");
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    for (const item of Array.isArray(v) ? v : [v]) url.searchParams.append(k, item);
  }
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Mercury ${res.status} on ${path}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export async function fetchAccounts(): Promise<MercuryAccount[]> {
  const data = await get<{ accounts: MercuryAccount[] }>("/accounts");
  return data.accounts.filter((a) => a.type === "mercury");
}

/** Every transaction created on or after `start` (YYYY-MM-DD), oldest first, across all pages. */
export async function fetchTransactionsSince(start: string, deadline: number): Promise<MercuryTransaction[]> {
  const out: MercuryTransaction[] = [];
  let cursor: string | null = null;
  for (;;) {
    if (Date.now() > deadline) throw new Error("Mercury fetch ran out of time budget");
    const page: { transactions: MercuryTransaction[]; page: { nextPage: string | null } } = await get(
      "/transactions",
      { start, limit: "1000", order: "asc", start_after: cursor ?? undefined }
    );
    out.push(...page.transactions);
    if (!page.page?.nextPage || page.transactions.length === 0) break;
    cursor = page.page.nextPage;
  }
  return out;
}
