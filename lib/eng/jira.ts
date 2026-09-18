// Reads the Jira Cloud REST API and keeps only what the metrics use.

import { FETCH_DAYS, SHIPPED_STATUS } from "./config";

export type StatusCategory = "new" | "indeterminate" | "done";

export type JiraChange = {
  at: number; // ms
  by: string | null;
  field: "status" | "priority" | "assignee";
  from: string | null;
  to: string | null;
};

export type JiraIssue = {
  key: string;
  project: string;
  summary: string;
  type: string;
  priority: string | null;
  status: string;
  category: StatusCategory;
  assignee: string | null;
  created: number;
  url: string;
  /** Oldest first. */
  history: JiraChange[];
  comments: { at: number; by: string | null }[];
};

export type JiraData = {
  issues: JiraIssue[];
  /** Every status name the site knows, with its category. */
  categories: Record<string, StatusCategory>;
};

const FIELDS = ["summary", "status", "priority", "assignee", "issuetype", "project", "created", "comment"];
const TRACKED = new Set(["status", "priority", "assignee"]);

function config() {
  const base = (process.env.JIRA_BASE_URL || "https://barlowlabs.atlassian.net").replace(/\/$/, "");
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  if (!email || !token) return null;
  return { base, auth: "Basic " + Buffer.from(`${email}:${token}`).toString("base64") };
}

export function jiraConfigured(): boolean {
  return config() !== null;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const c = config()!;
  const res = await fetch(c.base + path, {
    ...init,
    headers: {
      Authorization: c.auth,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Jira ${init?.method ?? "GET"} ${path.split("?")[0]} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

type RawHistory = {
  created: string;
  author?: { displayName?: string };
  items: { field: string; fromString: string | null; toString: string | null }[];
};

type RawComment = { created: string; author?: { displayName?: string } };

async function allComments(id: string): Promise<RawComment[]> {
  const all: RawComment[] = [];
  for (let startAt = 0; ; ) {
    const page = await call<{ comments: RawComment[]; total: number }>(
      `/rest/api/3/issue/${id}/comment?startAt=${startAt}&maxResults=100`
    );
    all.push(...page.comments);
    startAt += page.comments.length;
    if (startAt >= page.total || page.comments.length === 0) break;
  }
  return all;
}

function compactHistory(histories: RawHistory[]): JiraChange[] {
  const out: JiraChange[] = [];
  for (const h of histories) {
    for (const item of h.items) {
      if (!TRACKED.has(item.field)) continue;
      out.push({
        at: Date.parse(h.created),
        by: h.author?.displayName ?? null,
        field: item.field as JiraChange["field"],
        from: item.fromString,
        to: item.toString,
      });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

/**
 * Changelogs for many issues in few requests. The bulk endpoint is newer than
 * some sites' API, so a refusal falls back to one issue at a time.
 */
async function changelogs(ids: string[]): Promise<Map<string, JiraChange[]>> {
  const byId = new Map<string, RawHistory[]>();
  try {
    for (let i = 0; i < ids.length; i += 1000) {
      let nextPageToken: string | undefined;
      do {
        const page = await call<{
          issueChangeLogs: { issueId: string; changeHistories: RawHistory[] }[];
          nextPageToken?: string;
        }>("/rest/api/3/changelog/bulkfetch", {
          method: "POST",
          body: JSON.stringify({
            issueIdsOrKeys: ids.slice(i, i + 1000),
            fieldIds: [...TRACKED],
            maxResults: 1000,
            nextPageToken,
          }),
        });
        for (const log of page.issueChangeLogs) {
          byId.set(log.issueId, [...(byId.get(log.issueId) ?? []), ...log.changeHistories]);
        }
        nextPageToken = page.nextPageToken;
      } while (nextPageToken);
    }
  } catch {
    byId.clear();
    for (const id of ids) {
      const all: RawHistory[] = [];
      for (let startAt = 0; ; ) {
        const page = await call<{ values: RawHistory[]; isLast: boolean }>(
          `/rest/api/3/issue/${id}/changelog?startAt=${startAt}&maxResults=100`
        );
        all.push(...page.values);
        if (page.isLast || page.values.length === 0) break;
        startAt += page.values.length;
      }
      byId.set(id, all);
    }
  }
  return new Map([...byId].map(([id, h]) => [id, compactHistory(h)]));
}

export async function fetchJira(): Promise<JiraData> {
  const c = config()!;

  const statuses = await call<{ name: string; statusCategory: { key: StatusCategory } }[]>(
    "/rest/api/3/status"
  );
  const categories: Record<string, StatusCategory> = {};
  for (const s of statuses) categories[s.name] = s.statusCategory.key;

  // Everything touched in the widest window, plus anything not yet live however
  // old — a ticket nobody has touched in three months is exactly what the
  // stuck list is for. Not "statusCategory != Done": Ready for Deployed is in
  // that category, and a ticket parked there has not shipped.
  const jql = `updated >= -${FETCH_DAYS}d OR status != "${SHIPPED_STATUS}" ORDER BY updated DESC`;
  type Raw = {
    id: string;
    key: string;
    fields: {
      summary: string;
      status: { name: string; statusCategory: { key: StatusCategory } };
      priority: { name: string } | null;
      assignee: { displayName: string } | null;
      issuetype: { name: string };
      project: { key: string };
      created: string;
      comment?: { total: number; comments: RawComment[] };
    };
  };
  const raw: Raw[] = [];
  let nextPageToken: string | undefined;
  do {
    const params = new URLSearchParams({ jql, fields: FIELDS.join(","), maxResults: "100" });
    if (nextPageToken) params.set("nextPageToken", nextPageToken);
    const page = await call<{ issues: Raw[]; nextPageToken?: string }>(`/rest/api/3/search/jql?${params}`);
    raw.push(...page.issues);
    nextPageToken = page.nextPageToken;
  } while (nextPageToken);

  const logs = await changelogs(raw.map((r) => r.id));

  // Search returns a page of comments per issue; the few with more are read in full.
  const comments = new Map<string, RawComment[]>();
  for (const r of raw) {
    const c = r.fields.comment;
    if (c && c.total > c.comments.length) comments.set(r.id, await allComments(r.id));
    else comments.set(r.id, c?.comments ?? []);
  }

  const issues = raw.map((r): JiraIssue => {
    const f = r.fields;
    categories[f.status.name] ??= f.status.statusCategory.key;
    return {
      key: r.key,
      project: f.project.key,
      summary: f.summary,
      type: f.issuetype.name,
      priority: f.priority?.name ?? null,
      status: f.status.name,
      category: f.status.statusCategory.key,
      assignee: f.assignee?.displayName ?? null,
      created: Date.parse(f.created),
      url: `${c.base}/browse/${r.key}`,
      history: logs.get(r.id) ?? [],
      comments: (comments.get(r.id) ?? []).map((c) => ({
        at: Date.parse(c.created),
        by: c.author?.displayName ?? null,
      })),
    };
  });

  return { issues, categories };
}
