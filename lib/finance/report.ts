// Turns stored Mercury rows into weekly spending reports. Weeks run Monday to
// Sunday in Pacific time, since that is when the team reads them.

import type { FinanceData, TxnRow } from "./load";

const TZ = "America/Los_Angeles";
const DAY = 86400_000;

/** Kinds that move money between our own accounts, not in or out of the company. */
const INTERNAL = new Set(["internalTransfer", "treasuryTransfer"]);
/** Statuses that never actually moved money. */
const VOID = new Set(["cancelled", "failed", "reversed", "blocked"]);

export type Line = { name: string; amount: number; count: number };

export type Week = {
  /** Monday, YYYY-MM-DD in Pacific time. */
  start: string;
  /** Sunday, YYYY-MM-DD. */
  end: string;
  /** True for the week containing today. */
  partial: boolean;
  spend: number;
  income: number;
  net: number;
  count: number;
  pendingSpend: number;
  byCategory: Line[];
  byCounterparty: Line[];
  transactions: TxnRow[];
};

export type Report = {
  weeks: Week[]; // newest first, includes the partial current week
  cash: number;
  avgWeeklySpend: number | null; // last 4 completed weeks
  runwayWeeks: number | null;
  balanceHistory: { at: string; total: number }[];
  today: string;
};

/** YYYY-MM-DD for an instant, in Pacific time. */
export function ptDate(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    typeof iso === "string" ? new Date(iso) : iso
  );
}

function addDays(key: string, n: number): string {
  return new Date(Date.parse(key + "T00:00:00Z") + n * DAY).toISOString().slice(0, 10);
}

/** The Monday on or before a YYYY-MM-DD key. */
export function weekStart(key: string): string {
  const dow = new Date(Date.parse(key + "T00:00:00Z")).getUTCDay(); // 0 = Sunday
  return addDays(key, dow === 0 ? -6 : 1 - dow);
}

function counts(t: TxnRow): boolean {
  return !INTERNAL.has(t.kind) && !VOID.has(t.status);
}

function roll(lines: Map<string, Line>, name: string, amount: number) {
  const l = lines.get(name) ?? { name, amount: 0, count: 0 };
  l.amount += amount;
  l.count += 1;
  lines.set(name, l);
}

function sorted(lines: Map<string, Line>): Line[] {
  return [...lines.values()].sort((a, b) => b.amount - a.amount);
}

function buildWeek(start: string, txns: TxnRow[], today: string): Week {
  const end = addDays(start, 6);
  const cats = new Map<string, Line>();
  const parties = new Map<string, Line>();
  let spend = 0;
  let income = 0;
  let pendingSpend = 0;
  for (const t of txns) {
    if (!counts(t)) continue;
    if (t.amount < 0) {
      const a = -t.amount;
      spend += a;
      if (t.status === "pending") pendingSpend += a;
      roll(cats, t.category_name || t.mercury_category || "Uncategorized", a);
      roll(parties, t.counterparty_name || "Unknown", a);
    } else {
      income += t.amount;
    }
  }
  return {
    start,
    end,
    partial: end >= today,
    spend: round(spend),
    income: round(income),
    net: round(income - spend),
    count: txns.filter(counts).length,
    pendingSpend: round(pendingSpend),
    byCategory: sorted(cats),
    byCounterparty: sorted(parties).slice(0, 10),
    transactions: txns,
  };
}

export function buildReport(data: FinanceData, now = new Date(), weekCount = 13): Report {
  const today = ptDate(now);
  const thisMonday = weekStart(today);

  const byWeek = new Map<string, TxnRow[]>();
  for (const t of data.transactions) {
    const key = weekStart(ptDate(t.created_at));
    (byWeek.get(key) ?? byWeek.set(key, []).get(key)!).push(t);
  }

  const weeks: Week[] = [];
  for (let i = 0; i < weekCount; i++) {
    const start = addDays(thisMonday, -7 * i);
    weeks.push(buildWeek(start, byWeek.get(start) ?? [], today));
  }

  const completed = weeks.filter((w) => !w.partial).slice(0, 4);
  const avgWeeklySpend = completed.length ? round(completed.reduce((a, w) => a + w.spend, 0) / completed.length) : null;
  const cash = round(data.accounts.reduce((a, acc) => a + acc.current_balance, 0));
  const runwayWeeks = avgWeeklySpend && avgWeeklySpend > 0 ? Math.round((cash / avgWeeklySpend) * 10) / 10 : null;

  // Snapshots are per account; sum them by sync day so one point per day.
  const byDay = new Map<string, Map<string, number>>();
  for (const s of data.snapshots) {
    const day = ptDate(s.taken_at);
    const m = byDay.get(day) ?? byDay.set(day, new Map()).get(day)!;
    m.set(s.account_id, s.current_balance); // last snapshot of the day wins
  }
  const balanceHistory = [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([at, m]) => ({ at, total: round([...m.values()].reduce((a, b) => a + b, 0)) }));

  return { weeks, cash, avgWeeklySpend, runwayWeeks, balanceHistory, today };
}

const round = (n: number) => Math.round(n * 100) / 100;
