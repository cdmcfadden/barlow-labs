// Minimal Slack Web API client for the archive sync.
//
// Free-plan note: conversations.history will not return messages older than
// ~90 days, so the archive can only preserve what we mirror before Slack
// hides it. The sync is written to be resumable (see lib/archive.ts) because
// apps created after May 2025 are rate-limited to roughly one
// conversations.history call per minute.

const SLACK_API = "https://slack.com/api/";

export class SlackError extends Error {
  constructor(public method: string, public code: string) {
    super(`slack ${method} failed: ${code}`);
  }
}

/** Thrown when the caller's time budget ran out; the sync resumes next run. */
export class BudgetExceeded extends Error {}

export function slackToken(): string {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN is not set");
  return token;
}

export type SlackFile = {
  id: string;
  name?: string;
  title?: string;
  mimetype?: string;
  size?: number;
  url_private?: string;
  url_private_download?: string;
  permalink?: string;
};

export type SlackMessage = {
  ts: string;
  type?: string;
  subtype?: string;
  user?: string;
  bot_id?: string;
  username?: string;
  text?: string;
  thread_ts?: string;
  reply_count?: number;
  latest_reply?: string;
  edited?: { ts: string };
  reactions?: { name: string; count: number; users?: string[] }[];
  files?: SlackFile[];
  attachments?: unknown[];
  blocks?: unknown[];
};

export type SlackChannel = {
  id: string;
  name: string;
  is_member?: boolean;
  is_archived?: boolean;
  is_private?: boolean;
  topic?: { value: string };
  purpose?: { value: string };
};

type Options = { deadline?: number };

function remaining(deadline: number | undefined): number {
  return deadline === undefined ? Number.POSITIVE_INFINITY : deadline - Date.now();
}

/** GET a Slack method, retrying on 429 for as long as the deadline allows. */
export async function slackGet<T = Record<string, unknown>>(
  method: string,
  params: Record<string, string | number | undefined>,
  options: Options = {}
): Promise<T & { ok: boolean }> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, String(value));
  }

  for (let attempt = 0; ; attempt++) {
    if (remaining(options.deadline) <= 0) throw new BudgetExceeded(method);

    const res = await fetch(`${SLACK_API}${method}?${query}`, {
      headers: { Authorization: `Bearer ${slackToken()}` },
      cache: "no-store",
    });

    if (res.status === 429) {
      const waitMs = (Number(res.headers.get("retry-after")) || 60) * 1000 + 500;
      // Only wait if we can still do useful work afterwards.
      if (waitMs + 2000 > remaining(options.deadline)) throw new BudgetExceeded(method);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }

    const body = (await res.json()) as T & { ok: boolean; error?: string };
    if (!body.ok) {
      // Transient server-side hiccups are worth one more shot.
      if (attempt < 2 && (body.error === "service_unavailable" || body.error === "fatal_error")) {
        continue;
      }
      throw new SlackError(method, body.error ?? `http_${res.status}`);
    }
    return body;
  }
}

export async function slackPost<T = Record<string, unknown>>(
  method: string,
  body: Record<string, unknown>,
  options: Options = {}
): Promise<T & { ok: boolean }> {
  if (remaining(options.deadline) <= 0) throw new BudgetExceeded(method);
  const res = await fetch(`${SLACK_API}${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${slackToken()}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  });
  const parsed = (await res.json()) as T & { ok: boolean; error?: string };
  if (!parsed.ok) throw new SlackError(method, parsed.error ?? `http_${res.status}`);
  return parsed;
}

/** Every public channel in the workspace, archived ones included. */
export async function listPublicChannels(options: Options = {}): Promise<SlackChannel[]> {
  const channels: SlackChannel[] = [];
  let cursor: string | undefined;
  do {
    const page = await slackGet<{
      channels: SlackChannel[];
      response_metadata?: { next_cursor?: string };
    }>(
      "conversations.list",
      { types: "public_channel", exclude_archived: "false", limit: 200, cursor },
      options
    );
    channels.push(...page.channels);
    cursor = page.response_metadata?.next_cursor || undefined;
  } while (cursor);
  return channels;
}

export async function fetchUsers(options: Options = {}) {
  const users: {
    id: string;
    name?: string;
    real_name?: string;
    is_bot?: boolean;
    deleted?: boolean;
    profile?: { real_name?: string; display_name?: string; image_72?: string };
  }[] = [];
  let cursor: string | undefined;
  do {
    const page = await slackGet<{
      members: typeof users;
      response_metadata?: { next_cursor?: string };
    }>("users.list", { limit: 200, cursor }, options);
    users.push(...page.members);
    cursor = page.response_metadata?.next_cursor || undefined;
  } while (cursor);
  return users;
}

/** Downloads a Slack-hosted file. Returns null if it is already gone. */
export async function downloadFile(file: SlackFile): Promise<Blob | null> {
  const url = file.url_private_download ?? file.url_private;
  if (!url) return null;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${slackToken()}` } });
  if (!res.ok) return null;
  const blob = await res.blob();
  // Slack serves an HTML login page instead of a 403 when access is denied.
  if (blob.type.startsWith("text/html") && (file.mimetype ?? "") !== "text/html") return null;
  return blob;
}
