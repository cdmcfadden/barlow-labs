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

/** A span of days rolled up into totals: a Monday-to-Sunday week or a calendar month. */
export type Period = {
  /** First day, YYYY-MM-DD in Pacific time (a Monday for weeks, the 1st for months). */
  start: string;
  /** Last day, YYYY-MM-DD. */
  end: string;
  /** True for the period containing today. */
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

export type Week = Period;
export type Month = Period;

export type Report = {
  weeks: Week[]; // newest first, includes the partial current week
  months: Month[]; // newest first, includes the partial current month; only months the data fully covers
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

/** Paying our own Mercury card from checking shows up as a debit on one
 * account and a credit on the other; neither is money leaving the company. */
const OWN_ACCOUNT = /^Mercury (Checking|Savings|Credit|Treasury)\b/i;

export function isInternal(t: TxnRow): boolean {
  return INTERNAL.has(t.kind) || OWN_ACCOUNT.test(t.counterparty_name);
}

function counts(t: TxnRow): boolean {
  return !isInternal(t) && !VOID.has(t.status);
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

function buildPeriod(start: string, end: string, txns: TxnRow[], today: string): Period {
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

/** "2026-09" → "2026-08". */
function prevMonth(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, "0")}`;
}

/** Last day of a "YYYY-MM" month. */
function monthEnd(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10);
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
    weeks.push(buildPeriod(start, addDays(start, 6), byWeek.get(start) ?? [], today));
  }

  // Months, back to the oldest one whose first day the stored data reaches.
  // The sync only looks back so far, so an older month would be missing days.
  const byMonth = new Map<string, TxnRow[]>();
  let oldest = today;
  for (const t of data.transactions) {
    const key = ptDate(t.created_at);
    if (key < oldest) oldest = key;
    const month = key.slice(0, 7);
    (byMonth.get(month) ?? byMonth.set(month, []).get(month)!).push(t);
  }
  const months: Month[] = [];
  for (let m = today.slice(0, 7); m + "-01" >= oldest || m === today.slice(0, 7); m = prevMonth(m)) {
    months.push(buildPeriod(m + "-01", monthEnd(m), byMonth.get(m) ?? [], today));
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

  return { weeks, months, cash, avgWeeklySpend, runwayWeeks, balanceHistory, today };
}

const round = (n: number) => Math.round(n * 100) / 100;
