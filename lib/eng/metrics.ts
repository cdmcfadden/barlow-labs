// Turns what Jira and GitHub returned into the numbers on the page. Pure: no
// fetching, no clock except the `now` it is handed.

import { PEOPLE, REVIEW_RANK, SHIPPED_STATUS, STALE_AFTER_DAYS, WORKFLOW, isBot } from "./config";
import type { GitHubData } from "./github";
import type { JiraData, JiraIssue, StatusCategory } from "./jira";

const DAY = 86_400_000;

export type IssueRef = {
  key: string;
  summary: string;
  url: string;
  status: string;
  priority: string | null;
  assignee: string | null;
};

export type PersonRow = {
  name: string;
  /** Tickets they built that reached Live. */
  shipped: number;
  /** Tickets they handed to QA. */
  handedToQa: number;
  /** Open tickets assigned to them right now. */
  holding: IssueRef[];
  /** Times work they built was sent back out of QA. */
  bouncedBack: number;
  /** Times they sent someone's work back — the QA side of the same event. */
  sentBack: number;
  /** Tickets they passed out of QA. */
  approved: number;
  comments: number;
  commits: number;
  prsOpened: number;
  prsMerged: number;
  reviews: number;
  medianMergeHours: number | null;
  /** Where their work landed, busiest first: repos and Jira projects. */
  where: { name: string; count: number }[];
};

export type Bounce = {
  issue: IssueRef;
  count: number;
  builder: string | null;
  moves: { at: number; from: string; to: string; by: string | null; reopened: boolean }[];
};

export type Stuck = { issue: IssueRef; days: number; threshold: number; ageDays: number };

export type Metrics = {
  days: number;
  now: number;
  jira: boolean;
  github: boolean;
  totals: {
    created: number;
    shipped: number;
    handedToQa: number;
    openNow: number;
    waitingDeploy: number;
    medianCycleDays: number | null;
    medianLeadDays: number | null;
    reachedQa: number;
    bouncedIssues: number;
    comments: number;
    commits: number;
    prsMerged: number;
  };
  series: { start: number; end: number; created: number; shipped: number }[];
  openByStatus: { status: string; count: number }[];
  people: PersonRow[];
  bots: { name: string; commits: number; prs: number }[];
  bounces: Bounce[];
  stuck: Stuck[];
  projects: { key: string; created: number; shipped: number; open: number; openHigh: number }[];
  repos: { name: string; commits: number; prsMerged: number }[];
};

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function personResolver() {
  const byJira = new Map<string, string>();
  const byGitHub = new Map<string, string>();
  for (const p of PEOPLE) {
    p.jira.forEach((j) => byJira.set(j.toLowerCase(), p.name));
    p.github.forEach((g) => byGitHub.set(g.toLowerCase(), p.name));
  }
  return {
    jira: (n: string) => byJira.get(n.toLowerCase()) ?? n,
    github: (n: string) => byGitHub.get(n.toLowerCase()) ?? n,
  };
}

export function rankOf(status: string, categories: Record<string, StatusCategory>): number {
  const i = WORKFLOW.findIndex((w) => w.toLowerCase() === status.toLowerCase());
  if (i >= 0) return i;
  if (/review|qa|test|uat/i.test(status)) return REVIEW_RANK;
  const c = categories[status];
  if (c === "new") return 0;
  if (c === "done") return WORKFLOW.length; // Won't Do and the like: off the board
  return REVIEW_RANK - 1;
}

/** Who the ticket was assigned to at a moment, read back from its history. */
export function assigneeAt(issue: JiraIssue, at: number): string | null {
  const changes = issue.history.filter((h) => h.field === "assignee");
  if (!changes.length) return issue.assignee;
  let who = changes[0].from;
  for (const c of changes) {
    if (c.at > at) break;
    who = c.to;
  }
  return who;
}

/**
 * Who built a ticket, as of a moment: whoever held it when it last crossed
 * into QA before then — or, if nobody held it, whoever moved it across.
 *
 * Not the assignee at the end: the habit here is to reassign a ticket to the
 * reviewer on the way into QA, so by the time it is Live it belongs to Parth
 * or Chris, and crediting them would erase every developer from the page.
 */
export function builderAt(issue: JiraIssue, at: number, rank: (s: string | null) => number): string | null {
  let handover: JiraIssue["history"][number] | undefined;
  for (const m of issue.history) {
    if (m.at > at) break;
    if (m.field === "status" && rank(m.from) < REVIEW_RANK && rank(m.to) >= REVIEW_RANK) handover = m;
  }
  if (!handover) return assigneeAt(issue, at);
  // Read the holder just before the move: a reassignment to the reviewer made
  // in the same edit shares its timestamp and would otherwise win.
  return assigneeAt(issue, handover.at - 1) ?? handover.by;
}

function ref(i: JiraIssue): IssueRef {
  return {
    key: i.key,
    summary: i.summary,
    url: i.url,
    status: i.status,
    priority: i.priority,
    assignee: i.assignee,
  };
}

export function computeMetrics(
  jira: JiraData | null,
  gh: GitHubData | null,
  days: number,
  now: number
): Metrics {
  const start = now - days * DAY;
  const inWindow = (t: number) => t >= start && t <= now;
  const who = personResolver();
  const cats = jira?.categories ?? {};
  const rank = (s: string | null) => (s ? rankOf(s, cats) : 0);
  const shippedRank = rank(SHIPPED_STATUS);
  const devRank = rank("In Development");
  const passRank = rank("Ready for Deployed");
  const isShipped = (s: string | null) => s !== null && s.toLowerCase() === SHIPPED_STATUS.toLowerCase();

  const people = new Map<string, PersonRow & { _merge: number[]; _where: Map<string, number> }>();
  const person = (name: string) => {
    let p = people.get(name);
    if (!p) {
      p = {
        name,
        shipped: 0,
        handedToQa: 0,
        holding: [],
        bouncedBack: 0,
        sentBack: 0,
        approved: 0,
        comments: 0,
        commits: 0,
        prsOpened: 0,
        prsMerged: 0,
        reviews: 0,
        medianMergeHours: null,
        where: [],
        _merge: [],
        _where: new Map(),
      };
      people.set(name, p);
    }
    return p;
  };
  const credit = (p: ReturnType<typeof person>, where: string) =>
    p._where.set(where, (p._where.get(where) ?? 0) + 1);

  // Bins: daily for a week, weekly otherwise, laid back from now so the last
  // bin always ends today.
  const binSize = days <= 7 ? DAY : 7 * DAY;
  const binCount = Math.ceil((days * DAY) / binSize);
  const series = Array.from({ length: binCount }, (_, i) => {
    const end = now - (binCount - 1 - i) * binSize;
    return { start: Math.max(start, end - binSize), end, created: 0, shipped: 0 };
  });
  const bin = (t: number) => series.find((b) => t > b.start && t <= b.end) ?? (t === start ? series[0] : undefined);

  let created = 0;
  let shipped = 0;
  let handedToQa = 0;
  let comments = 0;
  let waitingDeploy = 0;
  // Distinct tickets, so the bounce rate divides tickets by tickets.
  const reachedQa = new Set<string>();
  const cycle: number[] = [];
  const lead: number[] = [];
  const bounces: Bounce[] = [];
  const stuck: Stuck[] = [];
  const openByStatus = new Map<string, number>();
  const projects = new Map<string, Metrics["projects"][number]>();
  const project = (k: string) => {
    let p = projects.get(k);
    if (!p) projects.set(k, (p = { key: k, created: 0, shipped: 0, open: 0, openHigh: 0 }));
    return p;
  };

  for (const issue of jira?.issues ?? []) {
    const proj = project(issue.project);
    const statusMoves = issue.history.filter((h) => h.field === "status");

    if (inWindow(issue.created)) {
      created++;
      proj.created++;
      const b = bin(issue.created);
      if (b) b.created++;
    }

    for (const c of issue.comments) {
      if (!inWindow(c.at) || !c.by) continue;
      comments++;
      const p = person(who.jira(c.by));
      p.comments++;
      credit(p, issue.project);
    }

    // Shipped: its last arrival at Live inside the window, credited to the
    // developer who built it. A ticket shipped twice counts once.
    const lastLive = statusMoves.filter((m) => isShipped(m.to) && !isShipped(m.from) && inWindow(m.at)).at(-1);
    if (lastLive) {
      shipped++;
      proj.shipped++;
      const b = bin(lastLive.at);
      if (b) b.shipped++;
      const builder = builderAt(issue, lastLive.at, rank);
      if (builder) {
        const p = person(who.jira(builder));
        p.shipped++;
        credit(p, issue.project);
      }
      lead.push(lastLive.at - issue.created);
      const started = statusMoves.find((m) => rank(m.to) >= devRank && rank(m.to) <= shippedRank);
      if (started && started.at <= lastLive.at) cycle.push(lastLive.at - started.at);
    }

    for (const m of statusMoves) {
      if (!inWindow(m.at)) continue;
      const from = rank(m.from);
      const to = rank(m.to);
      if (from < REVIEW_RANK && to >= REVIEW_RANK && to <= shippedRank) {
        reachedQa.add(issue.key);
        handedToQa++;
        const builder = builderAt(issue, m.at, rank);
        if (builder) person(who.jira(builder)).handedToQa++;
      }
      // Passed QA: out of the QA statuses into Ready for Deployed or Live.
      if (from >= REVIEW_RANK && from < passRank && to >= passRank && to <= shippedRank && m.by) {
        person(who.jira(m.by)).approved++;
      }
    }

    const back = statusMoves.filter(
      (m) => inWindow(m.at) && rank(m.from) >= REVIEW_RANK && rank(m.from) <= shippedRank && rank(m.to) < REVIEW_RANK
    );
    if (back.length) {
      // Was in QA by definition, even if it arrived before the window.
      reachedQa.add(issue.key);
      const builder = builderAt(issue, back.at(-1)!.at, rank);
      bounces.push({
        issue: ref(issue),
        count: back.length,
        builder: builder ? who.jira(builder) : null,
        moves: back.map((m) => ({
          at: m.at,
          from: m.from ?? "?",
          to: m.to ?? "?",
          by: m.by ? who.jira(m.by) : null,
          reopened: isShipped(m.from),
        })),
      });
      for (const m of back) {
        const b = builderAt(issue, m.at, rank);
        if (b) person(who.jira(b)).bouncedBack++;
        if (m.by) person(who.jira(m.by)).sentBack++;
      }
    }

    // Open: anything on the board short of Live. Ready for Deployed is open —
    // passed QA, but not in anyone's hands yet.
    const open = !isShipped(issue.status) && rank(issue.status) < shippedRank;
    if (open) {
      proj.open++;
      openByStatus.set(issue.status, (openByStatus.get(issue.status) ?? 0) + 1);
      if (rank(issue.status) === passRank) waitingDeploy++;
      if (issue.priority && issue.priority in STALE_AFTER_DAYS) proj.openHigh++;
      if (issue.assignee && rank(issue.status) >= devRank) {
        person(who.jira(issue.assignee)).holding.push(ref(issue));
      }
      const threshold = issue.priority ? STALE_AFTER_DAYS[issue.priority] : undefined;
      if (threshold !== undefined) {
        const since = statusMoves.at(-1)?.at ?? issue.created;
        const inStatus = (now - since) / DAY;
        if (inStatus >= threshold) {
          stuck.push({ issue: ref(issue), days: inStatus, threshold, ageDays: (now - issue.created) / DAY });
        }
      }
    }
  }

  // GitHub.
  const bots = new Map<string, { name: string; commits: number; prs: number }>();
  const bot = (n: string) => {
    let b = bots.get(n);
    if (!b) bots.set(n, (b = { name: n, commits: 0, prs: 0 }));
    return b;
  };
  const repos = new Map<string, { name: string; commits: number; prsMerged: number }>();
  const repo = (n: string) => {
    let r = repos.get(n);
    if (!r) repos.set(n, (r = { name: n, commits: 0, prsMerged: 0 }));
    return r;
  };
  const short = (full: string) => full.split("/").pop()!;
  let commits = 0;
  let prsMerged = 0;

  for (const c of gh?.commits ?? []) {
    if (!inWindow(c.at)) continue;
    commits++;
    repo(short(c.repo)).commits++;
    if (isBot(c.author)) {
      bot(c.author).commits++;
      continue;
    }
    const p = person(who.github(c.author));
    p.commits++;
    credit(p, short(c.repo));
  }
  for (const pr of gh?.pulls ?? []) {
    const authorIsBot = isBot(pr.author);
    const p = authorIsBot ? null : person(who.github(pr.author));
    if (inWindow(pr.created)) {
      if (p) {
        p.prsOpened++;
        credit(p, short(pr.repo));
      } else bot(pr.author).prs++;
    }
    if (pr.merged && inWindow(pr.merged)) {
      prsMerged++;
      repo(short(pr.repo)).prsMerged++;
      if (p) {
        p.prsMerged++;
        p._merge.push((pr.merged - pr.created) / 3_600_000);
      }
    }
    for (const r of pr.reviews) {
      if (inWindow(r.at) && !isBot(r.author)) person(who.github(r.author)).reviews++;
    }
  }

  const priorityOrder = (p: string | null) => (p ? Object.keys(STALE_AFTER_DAYS).indexOf(p) : 99);

  const rows = [...people.values()]
    .map(({ _merge, _where, ...row }) => ({
      ...row,
      medianMergeHours: median(_merge),
      where: [..._where].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    }))
    .filter(
      (r) =>
        r.shipped + r.handedToQa + r.holding.length + r.bouncedBack + r.sentBack + r.approved + r.comments +
          r.commits + r.prsOpened + r.prsMerged + r.reviews >
        0
    )
    .sort(
      (a, b) =>
        b.shipped - a.shipped || b.handedToQa - a.handedToQa || b.prsMerged - a.prsMerged || b.commits - a.commits
    );

  const cycleMedian = median(cycle);
  const leadMedian = median(lead);

  return {
    days,
    now,
    jira: jira !== null,
    github: gh !== null,
    totals: {
      created,
      shipped,
      handedToQa,
      openNow: [...openByStatus.values()].reduce((a, b) => a + b, 0),
      waitingDeploy,
      medianCycleDays: cycleMedian === null ? null : cycleMedian / DAY,
      medianLeadDays: leadMedian === null ? null : leadMedian / DAY,
      reachedQa: reachedQa.size,
      bouncedIssues: bounces.length,
      comments,
      commits,
      prsMerged,
    },
    series,
    openByStatus: [...openByStatus]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => rank(a.status) - rank(b.status)),
    people: rows,
    bots: [...bots.values()].sort((a, b) => b.commits - a.commits),
    bounces: bounces.sort((a, b) => b.count - a.count || b.moves.at(-1)!.at - a.moves.at(-1)!.at),
    stuck: stuck.sort((a, b) => priorityOrder(a.issue.priority) - priorityOrder(b.issue.priority) || b.days - a.days),
    projects: [...projects.values()].filter((p) => p.created + p.shipped + p.open > 0).sort((a, b) => b.open - a.open),
    repos: [...repos.values()].sort((a, b) => b.commits + b.prsMerged - (a.commits + a.prsMerged)),
  };
}
