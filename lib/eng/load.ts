import { unstable_cache } from "next/cache";
import { fetchGitHub, githubConfigured, type GitHubData } from "./github";
import { fetchJira, jiraConfigured, type JiraData } from "./jira";

// An hour is fresh enough for a page read at stand-up, and keeps a busy
// morning from spending the GitHub rate limit on the same numbers.
const HOUR = 3600;

const cachedJira = unstable_cache(async () => ({ at: Date.now(), data: await fetchJira() }), ["eng-jira-v1"], {
  revalidate: HOUR,
});
const cachedGitHub = unstable_cache(async () => ({ at: Date.now(), data: await fetchGitHub() }), ["eng-github-v1"], {
  revalidate: HOUR,
});

type Source<T> = { data: T | null; at: number | null; error: string | null; configured: boolean };

async function settle<T>(configured: boolean, load: () => Promise<{ at: number; data: T }>): Promise<Source<T>> {
  if (!configured) return { data: null, at: null, error: null, configured };
  try {
    const { at, data } = await load();
    return { data, at, error: null, configured };
  } catch (e) {
    // One source failing should not blank the other half of the page.
    return { data: null, at: null, error: e instanceof Error ? e.message : String(e), configured };
  }
}

export async function loadEngineering(): Promise<{ jira: Source<JiraData>; github: Source<GitHubData> }> {
  const [jira, github] = await Promise.all([
    settle(jiraConfigured(), cachedJira),
    settle(githubConfigured(), cachedGitHub),
  ]);
  return { jira, github };
}
