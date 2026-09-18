import Link from "next/link";
import { DEFAULT_WINDOW, WINDOWS } from "@/lib/eng/config";
import { loadEngineering } from "@/lib/eng/load";
import { computeMetrics, type IssueRef, type Metrics } from "@/lib/eng/metrics";
import FlowChart from "./FlowChart";

export const metadata = { title: "Engineering | Barlow Labs" };

export default async function EngineeringPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const requested = Number((await searchParams).days);
  const days = (WINDOWS as readonly number[]).includes(requested) ? requested : DEFAULT_WINDOW;

  const { jira, github } = await loadEngineering();
  const now = Date.now();
  const m = computeMetrics(jira.data, github.data, days, now);
  const asOf = Math.min(...[jira.at, github.at].filter((t): t is number => t !== null));

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <p className="text-sm text-muted-foreground">
        <Link href="/members" className="underline underline-offset-4 hover:text-foreground">
          Members
        </Link>{" "}
        / Engineering
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Engineering</h1>
          <p className="mt-2 text-muted-foreground">
            Who is doing what, what is moving, and what is stuck — from Jira and GitHub.
            {Number.isFinite(asOf) && <> Data as of {ago(now - asOf)}; refreshes hourly.</>}
          </p>
        </div>
        <nav className="flex rounded-md border p-0.5 text-sm" aria-label="Time window">
          {WINDOWS.map((w) => (
            <Link
              key={w}
              href={`/members/engineering?days=${w}`}
              aria-current={w === days ? "page" : undefined}
              className={`rounded px-3 py-1.5 transition-colors ${
                w === days ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {w} days
            </Link>
          ))}
        </nav>
      </div>

      <SourceNotice name="Jira" source={jira} env="JIRA_EMAIL and JIRA_API_TOKEN" />
      <SourceNotice name="GitHub" source={github} env="GITHUB_TOKEN" />

      <Tiles m={m} />

      {m.jira && (
        <Panel title="Tickets created and shipped to Live" note={days <= 7 ? "Per day" : "Per week"}>
          <FlowChart series={m.series} daily={days <= 7} />
          <details className="mt-3 text-sm text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">Show as a table</summary>
            <Table
              head={["Period", "Created", "Shipped"]}
              rows={m.series.map((b) => [range(b.start, b.end), b.created, b.shipped])}
              numeric={[1, 2]}
            />
          </details>
        </Panel>
      )}

      {m.jira && <StuckPanel m={m} />}
      <PeoplePanel m={m} />
      {m.jira && <BouncePanel m={m} />}

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {m.jira && (
          <Panel title="Open now, by status" tight>
            <Table head={["Status", "Tickets"]} rows={m.openByStatus.map((s) => [s.status, s.count])} numeric={[1]} />
          </Panel>
        )}
        {m.jira && (
          <Panel title="By Jira project" tight>
            <Table
              head={["Project", "Shipped", "Open", "Open, high"]}
              rows={m.projects.map((p) => [p.key, p.shipped, p.open, p.openHigh])}
              numeric={[1, 2, 3]}
            />
          </Panel>
        )}
        {m.github && (
          <Panel title="By repository" tight>
            <Table
              head={["Repo", "Commits", "PRs merged"]}
              rows={m.repos.filter((r) => r.commits + r.prsMerged > 0).map((r) => [r.name, r.commits, r.prsMerged])}
              numeric={[1, 2]}
            />
          </Panel>
        )}
      </div>

      <Method m={m} />
    </section>
  );
}

function Tiles({ m }: { m: Metrics }) {
  const t = m.totals;
  const bounceRate = t.reachedQa ? t.bouncedIssues / t.reachedQa : null;
  const tiles: { label: string; value: string; sub: string }[] = [];
  if (m.jira) {
    tiles.push(
      { label: "Shipped to Live", value: String(t.shipped), sub: `${t.created} created · net ${signed(t.shipped - t.created)}` },
      { label: "Waiting to deploy", value: String(t.waitingDeploy), sub: "passed QA, not yet Live" },
      { label: "Open now", value: String(t.openNow), sub: `${m.stuck.length} high-priority stuck` },
      {
        label: "Median cycle time",
        value: t.medianCycleDays === null ? "—" : `${t.medianCycleDays.toFixed(1)}d`,
        sub: t.medianLeadDays === null ? "development started to Live" : `${t.medianLeadDays.toFixed(1)}d from ticket created`,
      },
      {
        label: "Bounced back from QA",
        value: String(t.bouncedIssues),
        sub: bounceRate === null ? "no tickets reached QA" : `${Math.round(bounceRate * 100)}% of ${t.reachedQa} tickets that reached QA`,
      },
      { label: "Ticket comments", value: t.comments.toLocaleString(), sub: `${(t.comments / Math.max(1, m.days)).toFixed(1)} a day` }
    );
  }
  if (m.github) {
    tiles.push(
      { label: "PRs merged", value: String(t.prsMerged), sub: `across ${m.repos.filter((r) => r.prsMerged).length} repos` },
      { label: "Commits", value: t.commits.toLocaleString(), sub: botShare(m) }
    );
  }
  if (!tiles.length) return null;
  return (
    <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">{tile.label}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{tile.value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{tile.sub}</p>
        </div>
      ))}
    </div>
  );
}

function StuckPanel({ m }: { m: Metrics }) {
  return (
    <Panel
      title="High-priority tickets that have stopped moving"
      note="Open Highest tickets unmoved for 3+ days, High for 7+. Not limited to the window — stuck is stuck."
    >
      {m.stuck.length === 0 ? (
        <Empty>Nothing high-priority is sitting still.</Empty>
      ) : (
        <Table
          head={["Ticket", "Priority", "Status", "Assignee", "In status", "Age"]}
          rows={m.stuck.map((s) => [
            <IssueLink key="i" issue={s.issue} />,
            s.issue.priority ?? "—",
            s.issue.status,
            s.issue.assignee ?? <span className="text-accent">Unassigned</span>,
            `${Math.floor(s.days)}d`,
            `${Math.floor(s.ageDays)}d`,
          ])}
          numeric={[4, 5]}
        />
      )}
    </Panel>
  );
}

function PeoplePanel({ m }: { m: Metrics }) {
  if (!m.people.length) return null;
  const cols: { head: string; cell: (p: Metrics["people"][number]) => React.ReactNode; show: boolean; title?: string }[] = [
    { head: "Shipped", cell: (p) => p.shipped || "", show: m.jira, title: "Tickets they built that reached Live" },
    { head: "To QA", cell: (p) => p.handedToQa || "", show: m.jira, title: "Times they handed a ticket to QA (moved to UAT or later)" },
    { head: "Bounced back", cell: (p) => p.bouncedBack || "", show: m.jira, title: "Times work they built was sent back from QA to development" },
    { head: "Sent back", cell: (p) => p.sentBack || "", show: m.jira, title: "Times they sent a ticket back from QA to development" },
    { head: "Passed QA", cell: (p) => p.approved || "", show: m.jira, title: "Tickets they moved out of QA to Ready for Deployed or Live" },
    { head: "Comments", cell: (p) => p.comments || "", show: m.jira, title: "Comments they wrote on Jira tickets" },
    { head: "Holding", cell: (p) => p.holding.length || "", show: m.jira, title: "Open tickets assigned to them now, In Development or later" },
    { head: "Commits", cell: (p) => p.commits || "", show: m.github },
    { head: "PRs opened", cell: (p) => p.prsOpened || "", show: m.github },
    { head: "PRs merged", cell: (p) => p.prsMerged || "", show: m.github },
    { head: "Reviews", cell: (p) => p.reviews || "", show: m.github, title: "PR reviews given on others' PRs" },
    {
      head: "Median to merge",
      cell: (p) => (p.medianMergeHours === null ? "" : hours(p.medianMergeHours)),
      show: m.github,
      title: "PR opened to merged",
    },
  ];
  const shown = cols.filter((c) => c.show);
  return (
    <Panel title="Who is doing what" note={`Last ${m.days} days. Hover a column heading for how it is counted.`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4 font-normal">Person</th>
              {shown.map((c) => (
                <th key={c.head} title={c.title} className="whitespace-nowrap py-2 pr-4 text-right font-normal">
                  {c.head}
                </th>
              ))}
              <th className="py-2 font-normal">Where</th>
            </tr>
          </thead>
          <tbody>
            {m.people.map((p) => (
              <tr key={p.name} className="border-b align-top last:border-0">
                <td className="py-2 pr-4">
                  <div className="whitespace-nowrap">{p.name}</div>
                  {p.holding.length > 0 && (
                    <details className="mt-1 text-xs text-muted-foreground">
                      <summary className="cursor-pointer hover:text-foreground">Holding</summary>
                      <ul className="mt-1 space-y-1">
                        {p.holding.map((i) => (
                          <li key={i.key}>
                            <IssueLink issue={i} /> <span>· {i.status}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </td>
                {shown.map((c) => (
                  <td key={c.head} className="py-2 pr-4 text-right tabular-nums">
                    {c.cell(p)}
                  </td>
                ))}
                <td className="py-2 text-muted-foreground">
                  {p.where
                    .slice(0, 3)
                    .map((w) => `${w.name} ${w.count}`)
                    .join(" · ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {m.bots.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Not counted above:{" "}
          {m.bots.map((b) => `${b.name} (${b.commits.toLocaleString()} commits${b.prs ? `, ${b.prs} PRs` : ""})`).join(", ")}.
          Commits a tool makes on someone&apos;s behalf cannot be told apart by who asked for them.
        </p>
      )}
    </Panel>
  );
}

function BouncePanel({ m }: { m: Metrics }) {
  return (
    <Panel
      title="Tickets bounced between dev and QA"
      note="Moved from UAT or later back to development. Reopened means it had reached Live."
    >
      {m.bounces.length === 0 ? (
        <Empty>Nothing was sent back in this window.</Empty>
      ) : (
        <Table
          head={["Ticket", "Times", "Built by", "Now", "Moves"]}
          rows={m.bounces.map((b) => [
            <IssueLink key="i" issue={b.issue} />,
            b.count,
            b.builder ?? "—",
            b.issue.status,
            <ul key="m" className="space-y-0.5 text-xs text-muted-foreground">
              {b.moves.map((mv) => (
                <li key={mv.at}>
                  {day(mv.at)}: {mv.from} → {mv.to}
                  {mv.by && <> by {mv.by}</>}
                  {mv.reopened && <span className="text-accent"> · reopened</span>}
                </li>
              ))}
            </ul>,
          ])}
          numeric={[1]}
        />
      )}
    </Panel>
  );
}

function Method({ m }: { m: Metrics }) {
  return (
    <details className="mt-12 text-sm text-muted-foreground">
      <summary className="cursor-pointer hover:text-foreground">How these are counted</summary>
      <ul className="mt-3 max-w-3xl list-disc space-y-2 pl-5">
        <li>
          <strong className="text-foreground">Shipped</strong> is a ticket arriving at Live inside the window. Ready for
          Deployed does not count — it is shown as waiting to deploy, and stays on the stuck list if it sits.
        </li>
        <li>
          <strong className="text-foreground">Credit goes to whoever built it</strong>: the person holding the ticket
          when it last moved into UAT (or, if nobody held it, whoever moved it). Not the assignee at the end — tickets are
          reassigned to the reviewer on the way into QA, so that would credit the reviewer.
        </li>
        <li>
          <strong className="text-foreground">A bounce</strong> is a move from UAT or later back to development. The
          builder gets &ldquo;bounced back&rdquo;; the person who moved it gets &ldquo;sent back&rdquo;.
        </li>
        <li>
          <strong className="text-foreground">Cycle time</strong> runs from first entering In Development to Live; lead
          time from the ticket being created.
        </li>
        <li>
          <strong className="text-foreground">Commits</strong> are on each repo&apos;s default branch, excluding merge
          commits. Repos are every one pushed to in the last 90 days. Work done through Lovable is committed by its bot,
          which does not record who asked for it.
        </li>
        <li>
          People are matched across Jira and GitHub by the list in <code>lib/eng/config.ts</code>; anyone not in it
          appears under the name the source used.
        </li>
        <li>
          A status move undone within five minutes is treated as a slip and ignored — In Review → Live → UAT in three
          seconds did not ship anything.
        </li>
        <li>These show activity, not the value of it.</li>
        {m.jira && (
          <li>
            Read from Jira: {m.read.tickets} tickets, {m.read.statusChanges} status changes, {m.read.ticketComments}{" "}
            comments.
          </li>
        )}
      </ul>
    </details>
  );
}

function SourceNotice({
  name,
  source,
  env,
}: {
  name: string;
  source: { configured: boolean; error: string | null };
  env: string;
}) {
  if (source.configured && !source.error) return null;
  return (
    <div className="mt-6 rounded-lg border border-accent/40 bg-card p-4 text-sm">
      {source.configured ? (
        <>
          <strong>{name} could not be read.</strong>{" "}
          <span className="text-muted-foreground">{source.error}</span>
        </>
      ) : (
        <>
          <strong>{name} is not connected.</strong>{" "}
          <span className="text-muted-foreground">Set {env} in the site&apos;s Vercel environment to fill in this half.</span>
        </>
      )}
    </div>
  );
}

function Panel({
  title,
  note,
  tight,
  children,
}: {
  title: string;
  note?: string;
  tight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={tight ? "" : "mt-10"}>
      <h2 className="text-lg font-semibold">{title}</h2>
      {note && <p className="mt-1 text-sm text-muted-foreground">{note}</p>}
      <div className="mt-4 rounded-lg border bg-card p-4">{children}</div>
    </div>
  );
}

function Table({ head, rows, numeric = [] }: { head: string[]; rows: React.ReactNode[][]; numeric?: number[] }) {
  if (!rows.length) return <Empty>Nothing yet.</Empty>;
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

function IssueLink({ issue }: { issue: IssueRef }) {
  return (
    <a href={issue.url} target="_blank" rel="noreferrer" className="group">
      <span className="whitespace-nowrap font-medium underline underline-offset-4 group-hover:text-primary">{issue.key}</span>{" "}
      <span className="text-muted-foreground">{issue.summary}</span>
    </a>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function botShare(m: Metrics) {
  const bot = m.bots.reduce((a, b) => a + b.commits, 0);
  return bot ? `${Math.round((bot / Math.max(1, m.totals.commits)) * 100)}% from bots` : `in ${m.repos.length} repos`;
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
const day = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const range = (a: number, b: number) => `${day(a)} – ${day(b)}`;
const hours = (h: number) => (h < 1 ? `${Math.max(1, Math.round(h * 60))}m` : h < 48 ? `${Math.round(h)}h` : `${(h / 24).toFixed(1)}d`);
function ago(ms: number) {
  const min = Math.round(ms / 60_000);
  return min < 1 ? "just now" : min < 60 ? `${min} min ago` : `${Math.round(min / 60)}h ago`;
}
