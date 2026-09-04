import { getSql } from "@/lib/db";

export type ArchiveChannel = {
  id: string;
  name: string;
  purpose: string;
  topic: string;
  is_archived: boolean;
  message_count: number;
  last_synced_at: string | null;
  first_message_at: string | null;
  last_message_at: string | null;
};

export type ArchiveMessage = {
  channel_id: string;
  ts: string;
  thread_ts: string | null;
  user_id: string;
  user_name: string;
  subtype: string;
  text: string;
  reactions: { name: string; count: number }[];
  reply_count: number;
  posted_at: string;
  edited_at: string | null;
  permalink: string;
};

export type ArchiveFile = {
  id: string;
  channel_id: string;
  message_ts: string;
  name: string;
  mimetype: string;
  size: number;
  mirrored: boolean;
  slack_permalink: string;
};

/** Channels in one workspace that hold archived messages, chattiest first. */
export async function listArchiveChannels(teamId: string): Promise<ArchiveChannel[]> {
  const sql = getSql();
  return (await sql`
    SELECT c.id, c.name, c.purpose, c.topic, c.is_archived, c.last_synced_at,
           COUNT(m.ts)::int AS message_count,
           MIN(m.posted_at) AS first_message_at,
           MAX(m.posted_at) AS last_message_at
    FROM archive_channels c
    LEFT JOIN archive_messages m ON m.channel_id = c.id
    WHERE c.team_id = ${teamId}
    GROUP BY c.id
    ORDER BY COUNT(m.ts) DESC, c.name ASC
  `) as unknown as ArchiveChannel[];
}

export async function getChannelByName(teamId: string, name: string) {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, name, purpose, topic, is_archived, last_synced_at
    FROM archive_channels WHERE team_id = ${teamId} AND name = ${name} LIMIT 1
  `) as Record<string, string>[];
  return rows[0] ?? null;
}

/** Month buckets (YYYY-MM) for a channel, newest first, with summary status. */
export async function listChannelMonths(channelId: string) {
  const sql = getSql();
  return (await sql`
    SELECT to_char(m.posted_at, 'YYYY-MM') AS month,
           COUNT(*)::int AS message_count,
           COUNT(DISTINCT m.user_id)::int AS people,
           MAX(s.summary) AS summary
    FROM archive_messages m
    LEFT JOIN archive_summaries s
      ON s.channel_id = m.channel_id AND s.month = to_char(m.posted_at, 'YYYY-MM')
    WHERE m.channel_id = ${channelId}
    GROUP BY 1
    ORDER BY 1 DESC
  `) as unknown as {
    month: string;
    message_count: number;
    people: number;
    summary: string | null;
  }[];
}

export async function getMonthSummary(channelId: string, month: string) {
  const sql = getSql();
  const rows = (await sql`
    SELECT summary, generated_at, model, message_count
    FROM archive_summaries WHERE channel_id = ${channelId} AND month = ${month}
  `) as Record<string, string>[];
  return rows[0] ?? null;
}

export async function listMonthMessages(channelId: string, month: string) {
  const sql = getSql();
  return (await sql`
    SELECT channel_id, ts, thread_ts, user_id, user_name, subtype, text,
           reactions, reply_count, posted_at, edited_at, permalink
    FROM archive_messages
    WHERE channel_id = ${channelId} AND to_char(posted_at, 'YYYY-MM') = ${month}
    ORDER BY ts ASC
  `) as unknown as ArchiveMessage[];
}

export async function listMonthFiles(channelId: string, month: string) {
  const sql = getSql();
  return (await sql`
    SELECT f.id, f.channel_id, f.message_ts, f.name, f.mimetype, f.size,
           f.mirrored, f.slack_permalink
    FROM archive_files f
    JOIN archive_messages m ON m.channel_id = f.channel_id AND m.ts = f.message_ts
    WHERE f.channel_id = ${channelId} AND to_char(m.posted_at, 'YYYY-MM') = ${month}
  `) as unknown as ArchiveFile[];
}

export type SearchHit = ArchiveMessage & { channel_name: string; month: string };

export async function searchMessages(
  teamId: string,
  query: string,
  limit = 100
): Promise<SearchHit[]> {
  const sql = getSql();
  return (await sql`
    SELECT m.channel_id, m.ts, m.thread_ts, m.user_id, m.user_name, m.subtype,
           m.text, m.reactions, m.reply_count, m.posted_at, m.edited_at, m.permalink,
           c.name AS channel_name,
           to_char(m.posted_at, 'YYYY-MM') AS month
    FROM archive_messages m
    JOIN archive_channels c ON c.id = m.channel_id
    WHERE c.team_id = ${teamId}
      AND m.search @@ websearch_to_tsquery('english', ${query})
    ORDER BY ts_rank(m.search, websearch_to_tsquery('english', ${query})) DESC,
             m.posted_at DESC
    LIMIT ${limit}
  `) as unknown as SearchHit[];
}

export async function archiveStats(teamId: string) {
  const sql = getSql();
  const rows = (await sql`
    SELECT COUNT(*)::int AS messages,
           MIN(m.posted_at) AS oldest,
           MAX(m.posted_at) AS newest
    FROM archive_messages m
    JOIN archive_channels c ON c.id = m.channel_id
    WHERE c.team_id = ${teamId}
  `) as Record<string, string>[];
  const files = (await sql`
    SELECT COUNT(*)::int AS files
    FROM archive_files f
    JOIN archive_channels c ON c.id = f.channel_id
    WHERE c.team_id = ${teamId} AND f.mirrored
  `) as Record<string, string>[];
  return { ...rows[0], files: files[0]?.files ?? 0 } as unknown as {
    messages: number;
    oldest: string | null;
    newest: string | null;
    files: number;
  };
}

// ── Slack mrkdwn → HTML ──────────────────────────────────────────────────────

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Renders Slack mrkdwn as HTML. The message body is escaped before any markup
 * is added, so the only tags in the output are the ones this function emits.
 */
export function renderMrkdwn(text: string, names: Map<string, string>): string {
  // Slack escapes &, < and > on the way in; undo that so our own escaping pass
  // is the single source of truth.
  const raw = text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

  // Pull <...> entities out first so their pieces survive the escaping pass.
  const tokens: string[] = [];
  const stash = (html: string) => {
    tokens.push(html);
    return `@@SLACKTOKEN${tokens.length - 1}@@`;
  };

  let out = raw.replace(/<([^<>]+)>/g, (_match, body: string) => {
    const [target, label] = body.split("|");
    if (target.startsWith("@")) {
      const id = target.slice(1);
      return stash(
        `<span class="text-primary">@${escapeHtml(label || names.get(id) || id)}</span>`
      );
    }
    if (target.startsWith("#")) {
      const [id, name] = target.slice(1).split("|");
      return stash(`<span class="text-primary">#${escapeHtml(label || name || id)}</span>`);
    }
    if (target.startsWith("!")) {
      return stash(`<span class="text-primary">@${escapeHtml(label || target.slice(1))}</span>`);
    }
    if (/^https?:|^mailto:/.test(target)) {
      return stash(
        `<a class="underline underline-offset-2 hover:text-foreground" href="${escapeHtml(
          target
        )}" target="_blank" rel="noreferrer noopener">${escapeHtml(label || target)}</a>`
      );
    }
    return stash(escapeHtml(body));
  });

  out = escapeHtml(out);

  out = out
    .replace(
      /```([\s\S]+?)```/g,
      (_m, code: string) =>
        `<pre class="my-2 overflow-x-auto rounded-md bg-muted p-3 text-xs">${code.trim()}</pre>`
    )
    .replace(/`([^`\n]+)`/g, '<code class="rounded bg-muted px-1 py-0.5 text-[0.85em]">$1</code>')
    .replace(/(^|\s)\*([^*\n]+)\*/g, "$1<strong>$2</strong>")
    .replace(/(^|\s)_([^_\n]+)_/g, "$1<em>$2</em>")
    .replace(/(^|\s)~([^~\n]+)~/g, "$1<s>$2</s>")
    .replace(
      /^&gt; ?(.*)$/gm,
      '<span class="block border-l-2 border-border pl-3 text-muted-foreground">$1</span>'
    )
    .replace(/\n/g, "<br />");

  return out.replace(/@@SLACKTOKEN(\d+)@@/g, (_m, index: string) => tokens[Number(index)]);
}

export function slackTsToDate(ts: string): Date {
  return new Date(Number(ts.split(".")[0]) * 1000);
}

/** Slack user id → display name, for rendering @mentions in archived text. */
export async function userNameMap(teamId?: string): Promise<Map<string, string>> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, name, real_name FROM archive_users
    WHERE ${teamId ?? null}::text IS NULL OR team_id = ${teamId ?? null}
  `) as {
    id: string;
    name: string;
    real_name: string;
  }[];
  return new Map(rows.map((row) => [row.id, row.real_name || row.name || row.id]));
}

/** The workspace a mirrored file belongs to, for the download route's check. */
export async function fileTeam(fileId: string): Promise<string | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT c.team_id FROM archive_files f
    JOIN archive_channels c ON c.id = f.channel_id
    WHERE f.id = ${fileId}
  `) as { team_id: string }[];
  return rows[0]?.team_id ?? null;
}

/** Slack-escaped text (purposes, topics) rendered as plain readable text. */
export function plainText(input: string): string {
  return input
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/<([^<>|]+)\|([^<>]+)>/g, "$2")
    .replace(/<([^<>]+)>/g, "$1")
    .trim();
}
