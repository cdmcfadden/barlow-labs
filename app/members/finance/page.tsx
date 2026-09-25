import Link from "next/link";
import { cookies } from "next/headers";
import { SESSION_COOKIE, openSession } from "@/lib/session";
import { loadFinance } from "@/lib/finance/load";
import { buildReport, type Report, type Week } from "@/lib/finance/report";
import WeeklyChart from "./WeeklyChart";

export const metadata = { title: "Finance | Barlow Labs" };
export const dynamic = "force-dynamic";

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; synced?: string }>;
}) {
  const session = await openSession((await cookies()).get(SESSION_COOKIE)?.value);
  const viewers = (process.env.FINANCE_VIEWERS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (viewers.length && (!session || !viewers.includes(session.sub))) {
    return (
      <section className="mx-auto max-w-6xl px-6 py-16">
        <Crumb />
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Finance</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          This page is limited to the people listed in the site&apos;s FINANCE_VIEWERS setting. Ask Chris if you
          should be on it.
        </p>
      </section>
    );
  }

  const params = await searchParams;
  const source = await loadFinance();
  const report = source.data ? buildReport(source.data) : null;
  const completed = report?.weeks.filter((w) => !w.partial) ?? [];
  const selected =
    report?.weeks.find((w) => w.start === params.week) ?? completed[0] ?? report?.weeks[0] ?? null;
  const previous = selected ? report!.weeks[report!.weeks.indexOf(selected) + 1] ?? null : null;

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <Crumb />
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Finance</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Weekly spending from the Mercury account. Money moved between our own Mercury accounts is left out;
            fees, card charges, and payments to anyone else count.
            {source.data?.lastSync && <> Synced {ago(Date.now() - Date.parse(source.data.lastSync))}; the cron runs every Monday morning.</>}
          </p>
        </div>
        <a
          href="/api/finance/sync"
          className="rounded-md border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Refresh from Mercury
        </a>
      </div>

      {params.synced && (
        <div className="mt-6 rounded-lg border border-accent/40 bg-card p-4 text-sm">Pulled the latest from Mercury.</div>
      )}
      <SourceNotice source={source} />

      {report && selected && (
        <>
          <WeekNav report={report} selected={selected} />
          <Tiles report={report} week={selected} previous={previous} />

          <Panel
            title="Spend and income by week"
            note="Bars are completed Monday-to-Sunday weeks in Pacific time; the hatched bar is this week so far."
          >
            <WeeklyChart weeks={[...report.weeks].reverse()} selected={selected.start} />
          </Panel>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <Panel title={`Where it went, ${range(selected)}`} tight>
              <Table
                head={["Category", "Spent", "Txns"]}
                rows={selected.byCategory.map((c) => [c.name, money(c.amount), c.count])}
                numeric={[1, 2]}
              />
            </Panel>
            <Panel title="Biggest counterparties" tight>
              <Table
                head={["Paid to", "Spent", "Txns"]}
                rows={selected.byCounterparty.map((c) => [c.name, money(c.amount), c.count])}
                numeric={[1, 2]}
              />
            </Panel>
          </div>

          <Panel title={`Every transaction, ${range(selected)}`} note={`${selected.count} that moved money, newest first.`}>
            <Table
              head={["Date", "Counterparty", "Category", "Status", "Amount"]}
              rows={selected.transactions.map((t) => [
                day(t.created_at),
                <a key="c" href={t.dashboard_link || "#"} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-primary">
                  {t.counterparty_name || t.bank_description || "—"}
                </a>,
                t.category_name || t.mercury_category || <span className="text-muted-foreground">—</span>,
                <Status key="s" value={t.status} kind={t.kind} />,
                <span key="a" className={t.amount > 0 ? "text-primary" : ""}>{signedMoney(t.amount)}</span>,
              ])}
              numeric={[4]}
            />
          </Panel>

          <Panel title="Cash on hand" note="Sum of active Mercury account balances at each sync.">
            <Table
              head={["Account", "Balance"]}
              rows={source.data!.accounts.map((a) => [a.name, money(a.current_balance)])}
              numeric={[1]}
            />
            {report.balanceHistory.length > 1 && (
              <p className="mt-3 text-xs text-muted-foreground">
                {report.balanceHistory.map((b) => `${day(b.at)} ${money(b.total)}`).join(" · ")}
              </p>
            )}
          </Panel>

          <Method />
        </>
      )}
    </section>
  );
}

function Crumb() {
  return (
    <p className="text-sm text-muted-foreground">
      <Link href="/members" className="underline underline-offset-4 hover:text-foreground">
        Members
      </Link>{" "}
      / Finance
    </p>
  );
}

function WeekNav({ report, selected }: { report: Report; selected: Week }) {
  return (
    <nav className="mt-8 flex flex-wrap gap-1 rounded-md border p-0.5 text-sm" aria-label="Week">
      {report.weeks.map((w) => (
        <Link
          key={w.start}
          href={`/members/finance?week=${w.start}`}
          aria-current={w.start === selected.start ? "page" : undefined}
          className={`rounded px-2.5 py-1.5 transition-colors ${
            w.start === selected.start ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {w.partial ? "This week" : shortDay(w.start)}
        </Link>
      ))}
    </nav>
  );
}

function Tiles({ report, week, previous }: { report: Report; week: Week; previous: Week | null }) {
  const delta = previous && previous.spend > 0 ? (week.spend - previous.spend) / previous.spend : null;
  const tiles = [
    {
      label: week.partial ? "Spent so far this week" : "Spent",
      value: money(week.spend),
      sub:
        delta === null
          ? `${week.count} transactions`
          : `${delta >= 0 ? "+" : ""}${Math.round(delta * 100)}% vs prior week (${money(previous!.spend)})`,
    },
    { label: "Came in", value: money(week.income), sub: "deposits, refunds, interest" },
    { label: "Net", value: signedMoney(week.net), sub: week.pendingSpend ? `${money(week.pendingSpend)} still pending` : "all settled" },
    { label: "Cash now", value: money(report.cash), sub: `${report.balanceHistory.length} balance snapshots` },
    {
      label: "Average weekly spend",
      value: report.avgWeeklySpend === null ? "—" : money(report.avgWeeklySpend),
      sub: "last 4 completed weeks",
    },
    {
      label: "Runway at that pace",
      value: report.runwayWeeks === null ? "—" : runway(report.runwayWeeks),
      sub: "cash ÷ average weekly spend",
    },
  ];
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">{t.label}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{t.value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t.sub}</p>
        </div>
      ))}
    </div>
  );
}

function Status({ value, kind }: { value: string; kind: string }) {
  const label = kind === "internalTransfer" || kind === "treasuryTransfer" ? "internal" : value;
  const tone =
    label === "internal" || value === "pending" ? "text-muted-foreground" : value === "sent" ? "" : "text-accent";
  return <span className={tone}>{label}</span>;
}

function SourceNotice({ source }: { source: { configured: boolean; error: string | null; data: unknown } }) {
  if (!source.configured) {
    return (
      <div className="mt-6 rounded-lg border border-accent/40 bg-card p-4 text-sm">
        <strong>Mercury is not connected.</strong>{" "}
        <span className="text-muted-foreground">
          Create a Read Only API token in Mercury (Settings → Tokens) and set MERCURY_API_TOKEN in the site&apos;s Vercel
          environment, then press Refresh.
        </span>
      </div>
    );
  }
  if (source.error) {
    return (
      <div className="mt-6 rounded-lg border border-accent/40 bg-card p-4 text-sm">
        <strong>Could not read the stored data.</strong> <span className="text-muted-foreground">{source.error}</span>
      </div>
    );
  }
  return null;
}

function Method() {
  return (
    <details className="mt-12 text-sm text-muted-foreground">
      <summary className="cursor-pointer hover:text-foreground">How these are counted</summary>
      <ul className="mt-3 max-w-3xl list-disc space-y-2 pl-5">
        <li>A week is Monday through Sunday in Pacific time, by the date Mercury created the transaction.</li>
        <li>
          <strong className="text-foreground">Spent</strong> is every outgoing amount except transfers between our own
          Mercury accounts. Pending card charges are included, since they will settle; cancelled, failed, reversed, and
          blocked ones are not.
        </li>
        <li>
          Categories are Mercury&apos;s own: a custom category if one was set in the dashboard, otherwise the merchant
          type Mercury guessed.
        </li>
        <li>
          <strong className="text-foreground">Runway</strong> divides cash on hand by the average of the last four
          completed weeks. It ignores income, so it is the pessimistic number.
        </li>
        <li>Data is re-read from Mercury every Monday morning, and whenever someone presses Refresh.</li>
      </ul>
    </details>
  );
}

function Panel({ title, note, tight, children }: { title: string; note?: string; tight?: boolean; children: React.ReactNode }) {
  return (
    <div className={tight ? "" : "mt-10"}>
      <h2 className="text-lg font-semibold">{title}</h2>
      {note && <p className="mt-1 text-sm text-muted-foreground">{note}</p>}
      <div className="mt-4 rounded-lg border bg-card p-4">{children}</div>
    </div>
  );
}

function Table({ head, rows, numeric = [] }: { head: string[]; rows: React.ReactNode[][]; numeric?: number[] }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">Nothing in this week.</p>;
  const align = (i: number) => (numeric.includes(i) ? "text-right tabular-nums" : "");
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            {head.map((h, i) => (
              <th key={h} className={`whitespace-nowrap py-2 pr-4 font-normal last:pr-0 ${align(i)}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-foreground">
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b align-top last:border-0">
              {r.map((c, i) => (
                <td key={i} className={`py-2 pr-4 last:pr-0 ${align(i)}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usdCents = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const money = (n: number) => (Math.abs(n) >= 1000 ? usd.format(n) : usdCents.format(n));
const signedMoney = (n: number) => (n > 0 ? `+${money(n)}` : money(n));
const day = (iso: string) =>
  new Date(iso.length === 10 ? iso + "T12:00:00Z" : iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  });
const shortDay = (key: string) => day(key);
const range = (w: Week) => `${day(w.start)} – ${day(w.end)}`;
function runway(weeks: number) {
  return weeks >= 104 ? `${(weeks / 52).toFixed(1)} yrs` : weeks >= 12 ? `${(weeks / 4.33).toFixed(1)} mo` : `${weeks} wks`;
}
function ago(ms: number) {
  const min = Math.round(ms / 60_000);
  return min < 1 ? "just now" : min < 60 ? `${min} min ago` : min < 2880 ? `${Math.round(min / 60)}h ago` : `${Math.round(min / 1440)}d ago`;
}
