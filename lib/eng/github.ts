// Reads GitHub's GraphQL API and keeps only what the metrics use.

import { FETCH_DAYS, GITHUB_REPOS } from "./config";

export type Commit = { repo: string; author: string; at: number; oid: string };

export type PullRequest = {
  repo: string;
  /** Commits on the PR's branch; how work that never lands on main is counted. */
  commits: Commit[];
  number: number;
  title: string;
  url: string;
  author: string;
  created: number;
  merged: number | null;
  closed: number | null;
  reviews: { author: string; at: number }[];
};

export type GitHubData = { repos: string[]; commits: Commit[]; pulls: PullRequest[] };

export function githubConfigured(): boolean {
  return Boolean(process.env.GITHUB_TOKEN);
}

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (!res.ok || body.errors?.length || !body.data) {
    throw new Error(`GitHub ${res.status}: ${body.errors?.map((e) => e.message).join("; ") ?? "no data"}`);
  }
  return body.data;
}

type Actor = { login: string } | null;

type CommitNode = {
  oid: string;
  authoredDate: string;
  parents: { totalCount: number };
  author: { name: string | null; user: Actor } | null;
};

function toCommit(repo: string, c: CommitNode): Commit {
  return {
    repo,
    oid: c.oid,
    author: c.author?.user?.login ?? c.author?.name ?? "unknown",
    at: Date.parse(c.authoredDate),
  };
}

async function commits(repo: string, since: string): Promise<Commit[]> {
  const [owner, name] = repo.split("/");
  const out: Commit[] = [];
  let after: string | null = null;
  for (;;) {
    type Page = {
      repository: {
        defaultBranchRef: {
          target: {
            history: {
              pageInfo: { hasNextPage: boolean; endCursor: string };
              nodes: CommitNode[];
            };
          };
        } | null;
      };
    };
    const data: Page = await gql<Page>(
      `query($owner: String!, $name: String!, $since: GitTimestamp!, $after: String) {
        repository(owner: $owner, name: $name) {
          defaultBranchRef { target { ... on Commit {
            history(since: $since, first: 100, after: $after) {
              pageInfo { hasNextPage endCursor }
              nodes { oid authoredDate parents { totalCount } author { name user { login } } }
            }
          } } }
        }
      }`,
      { owner, name, since, after }
    );
    const history = data.repository.defaultBranchRef?.target.history;
    if (!history) break;
    for (const c of history.nodes) {
      // A merge commit is the PR landing, which the PR already counts.
      if (c.parents.totalCount > 1) continue;
      out.push(toCommit(repo, c));
    }
    if (!history.pageInfo.hasNextPage) break;
    after = history.pageInfo.endCursor;
  }
  return out;
}

/**
 * Every branch head's recent history in one query. Lovable pushes branches
 * with no pull request, so neither main nor the PR list sees that work.
 * Branches with more than 100 commits in the window are cut off there; main,
 * which is the one that gets them, is read separately and in full.
 */
async function branchCommits(repo: string, since: string): Promise<Commit[]> {
  const [owner, name] = repo.split("/");
  const out: Commit[] = [];
  let after: string | null = null;
  for (;;) {
    type Page = {
      repository: {
        refs: {
          pageInfo: { hasNextPage: boolean; endCursor: string };
          nodes: { target: { history: { nodes: CommitNode[] } } | null }[];
        };
      };
    };
    const data: Page = await gql<Page>(
      `query($owner: String!, $name: String!, $since: GitTimestamp!, $after: String) {
        repository(owner: $owner, name: $name) {
          refs(refPrefix: "refs/heads/", first: 50, after: $after) {
            pageInfo { hasNextPage endCursor }
            nodes {
              target { ... on Commit {
                history(since: $since, first: 100) {
                  nodes { oid authoredDate parents { totalCount } author { name user { login } } }
                }
              } }
            }
          }
        }
      }`,
      { owner, name, since, after }
    );
    for (const ref of data.repository.refs.nodes) {
      for (const c of ref.target?.history.nodes ?? []) {
        if (c.parents.totalCount <= 1) out.push(toCommit(repo, c));
      }
    }
    if (!data.repository.refs.pageInfo.hasNextPage) break;
    after = data.repository.refs.pageInfo.endCursor;
  }
  return out;
}

/** PRs updated in the window, newest first, so one merged today but opened last quarter is still seen. */
async function pulls(repo: string, since: string): Promise<PullRequest[]> {
  const [owner, name] = repo.split("/");
  const out: PullRequest[] = [];
  let after: string | null = null;
  for (;;) {
    type Page = {
      repository: {
        pullRequests: {
          pageInfo: { hasNextPage: boolean; endCursor: string };
          nodes: {
            number: number;
            title: string;
            url: string;
            createdAt: string;
            updatedAt: string;
            mergedAt: string | null;
            closedAt: string | null;
            author: Actor;
            reviews: { nodes: { author: Actor; submittedAt: string | null }[] };
            commits: { nodes: { commit: CommitNode }[] };
          }[];
        };
      };
    };
    const data: Page = await gql<Page>(
      `query($owner: String!, $name: String!, $after: String) {
        repository(owner: $owner, name: $name) {
          pullRequests(first: 50, after: $after, orderBy: { field: UPDATED_AT, direction: DESC }) {
            pageInfo { hasNextPage endCursor }
            nodes {
              number title url createdAt updatedAt mergedAt closedAt
              author { login }
              reviews(first: 50) { nodes { author { login } submittedAt } }
              commits(last: 100) { nodes { commit { oid authoredDate parents { totalCount } author { name user { login } } } } }
            }
          }
        }
      }`,
      { owner, name, after }
    );
    const page = data.repository.pullRequests;
    let done = false;
    for (const p of page.nodes) {
      if (p.updatedAt < since) {
        done = true;
        break;
      }
      out.push({
        repo,
        commits: p.commits.nodes.map((n) => n.commit).filter((c) => c.parents.totalCount <= 1).map((c) => toCommit(repo, c)),
        number: p.number,
        title: p.title,
        url: p.url,
        author: p.author?.login ?? "ghost",
        created: Date.parse(p.createdAt),
        merged: p.mergedAt ? Date.parse(p.mergedAt) : null,
        closed: p.closedAt ? Date.parse(p.closedAt) : null,
        reviews: p.reviews.nodes
          .filter((r) => r.author && r.submittedAt && r.author.login !== p.author?.login)
          .map((r) => ({ author: r.author!.login, at: Date.parse(r.submittedAt!) })),
      });
    }
    if (done || !page.pageInfo.hasNextPage) break;
    after = page.pageInfo.endCursor;
  }
  return out;
}

export async function fetchGitHub(): Promise<GitHubData> {
  const since = new Date(Date.now() - FETCH_DAYS * 86_400_000).toISOString();
  const list = GITHUB_REPOS;
  const perRepo = await Promise.all(
    list.map(async (repo) => {
      const [c, b, p] = await Promise.all([commits(repo, since), branchCommits(repo, since), pulls(repo, since)]);
      return { c: [...c, ...b], p };
    })
  );

  // Main alone misses two thirds of the work here: squash-merged branches and
  // branches still open. Main, every branch head and every pull request are
  // read, then deduplicated by sha.
  const byOid = new Map<string, Commit>();
  for (const c of perRepo.flatMap((r) => r.c)) byOid.set(c.oid, c);
  for (const pr of perRepo.flatMap((r) => r.p)) {
    for (const c of pr.commits) if (Date.parse(since) <= c.at) byOid.set(c.oid, c);
  }

  return {
    repos: list,
    commits: [...byOid.values()],
    pulls: perRepo.flatMap((r) => r.p),
  };
}
