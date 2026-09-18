// Reads GitHub's GraphQL API and keeps only what the metrics use.

import { FETCH_DAYS } from "./config";

export type Commit = { repo: string; author: string; at: number };

export type PullRequest = {
  repo: string;
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

/**
 * GITHUB_REPOS ("owner/name,owner/name") pins the list. Without it, every repo
 * the token can see that was pushed to in the window — so a new product shows
 * up without anyone remembering to add it here.
 */
async function repos(since: string): Promise<string[]> {
  const pinned = process.env.GITHUB_REPOS?.split(",").map((s) => s.trim()).filter(Boolean);
  if (pinned?.length) return pinned;

  const data = await gql<{
    viewer: { repositories: { nodes: { nameWithOwner: string; pushedAt: string | null; isFork: boolean }[] } };
  }>(
    `query {
      viewer {
        repositories(first: 100, orderBy: { field: PUSHED_AT, direction: DESC },
                     ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]) {
          nodes { nameWithOwner pushedAt isFork }
        }
      }
    }`,
    {}
  );
  return data.viewer.repositories.nodes
    .filter((r) => !r.isFork && r.pushedAt && r.pushedAt >= since)
    .map((r) => r.nameWithOwner);
}

type Actor = { login: string } | null;

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
              nodes: {
                authoredDate: string;
                parents: { totalCount: number };
                author: { name: string | null; user: Actor } | null;
              }[];
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
              nodes { authoredDate parents { totalCount } author { name user { login } } }
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
      out.push({
        repo,
        author: c.author?.user?.login ?? c.author?.name ?? "unknown",
        at: Date.parse(c.authoredDate),
      });
    }
    if (!history.pageInfo.hasNextPage) break;
    after = history.pageInfo.endCursor;
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
  const list = await repos(since);
  const perRepo = await Promise.all(
    list.map(async (repo) => {
      const [c, p] = await Promise.all([commits(repo, since), pulls(repo, since)]);
      return { c, p };
    })
  );
  return {
    repos: list,
    commits: perRepo.flatMap((r) => r.c),
    pulls: perRepo.flatMap((r) => r.p),
  };
}
