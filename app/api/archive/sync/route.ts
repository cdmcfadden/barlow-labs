import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { SESSION_COOKIE, openSession } from "@/lib/session";
import { getSql } from "@/lib/db";
import {
  BudgetExceeded,
  downloadFile,
  fetchUsers,
  listPublicChannels,
  slackGet,
  slackPost,
  type SlackChannel,
  type SlackFile,
  type SlackMessage,
} from "@/lib/slack";
import { botToken, syncableWorkspaces, workspaceBySlug, type Workspace } from "@/lib/workspaces";

// Hobby plan caps functions at 60s; the sync is checkpointed, so a run that
// hits the ceiling simply resumes from its cursor on the next invocation.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Free-plan Slack stops returning history at ~90 days. We start a cold channel
// a little inside that edge so the first run doesn't chase messages Slack has
// already dropped.
const COLD_START_DAYS = 88;
const DEFAULT_BUDGET_MS = 45_000;
const USER_REFRESH_HOURS = 12;
// Screen recordings can run to hundreds of MB; skip the outliers rather than
// quietly filling the Blob store. Their metadata is still archived.
const MAX_FILE_MB = Number(process.env.ARCHIVE_MAX_FILE_MB ?? 200);
// Blob storage is finite (1GB on Hobby) and the archive never deletes, so
// bulky media is capped separately from documents. Set ARCHIVE_MAX_VIDEO_MB=0
// to keep video metadata without storing the file.
const MAX_VIDEO_MB = Number(process.env.ARCHIVE_MAX_VIDEO_MB ?? 25);
const MAX_IMAGE_MB = Number(process.env.ARCHIVE_MAX_IMAGE_MB ?? 15);
// Rows per write. Neon charges a round trip per statement, so batching is the
// difference between a sync that finishes and one that times out.
const USER_CHUNK = 500;
const MESSAGE_CHUNK = 200;

type ChannelRow = {
  id: string;
  name: string;
  synced_through_ts: string;
  sync_cursor: string | null;
  sync_window_start: string | null;
};

type Counters = { messages: number; files: number; skipped: number };

/** Set when the Blob store reports it is full, to stop retrying every file. */
class StorageFull extends Error {}

/** Per-type ceiling, in bytes. 0 means "record it, don't store it". */
function sizeLimit(mimetype: string): number {
  const kind = mimetype.split("/")[0];
  const mb = kind === "video" ? MAX_VIDEO_MB : kind === "image" ? MAX_IMAGE_MB : MAX_FILE_MB;
  return mb * 1024 * 1024;
}

/** Everything one workspace's sync needs: credentials, identity, deadline. */
type Run = {
  workspace: Workspace;
  token: string;
  names: Map<string, string>;
  deadline: number;
  counters: Counters;
  /** Flipped once the Blob store reports it is full. */
  storageFull: boolean;
};

function tsSecondsAgo(days: number): string {
  return String(Math.floor(Date.now() / 1000) - days * 86400);
}

function postedAt(ts: string): string {
  return new Date(Number(ts.split(".")[0]) * 1000).toISOString();
}

async function authorize(request: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth === `Bearer ${secret}`) return true;
  // Members can also kick off a sync by hand from the archive page.
  return Boolean(await openSession(request.cookies.get(SESSION_COOKIE)?.value));
}

async function refreshUsers(workspace: Workspace, token: string, deadline: number) {
  const sql = getSql();
  const rows = (await sql`
    SELECT MAX(updated_at) AS updated_at FROM archive_users WHERE team_id = ${workspace.teamId}
  `) as { updated_at: string | null }[];
  const last = rows[0]?.updated_at ? new Date(rows[0].updated_at).getTime() : 0;
  if (Date.now() - last < USER_REFRESH_HOURS * 3600 * 1000) return 0;

  const users = await fetchUsers({ token, deadline });
  // A row per round trip does not scale: F3 Cascades alone has ~1,800 members,
  // which spent an entire sync budget before any message was read.
  for (let start = 0; start < users.length; start += USER_CHUNK) {
    const chunk = users.slice(start, start + USER_CHUNK);
    await sql`
      INSERT INTO archive_users (id, team_id, name, real_name, avatar, is_bot, deleted, updated_at)
      SELECT id, ${workspace.teamId}, name, real_name, avatar, is_bot, deleted, now()
      FROM UNNEST(
        ${chunk.map((user) => user.id)}::text[],
        ${chunk.map((user) => user.name ?? "")}::text[],
        ${chunk.map((user) => user.profile?.real_name ?? user.real_name ?? "")}::text[],
        ${chunk.map((user) => user.profile?.image_72 ?? "")}::text[],
        ${chunk.map((user) => Boolean(user.is_bot))}::boolean[],
        ${chunk.map((user) => Boolean(user.deleted))}::boolean[]
      ) AS t(id, name, real_name, avatar, is_bot, deleted)
      ON CONFLICT (id) DO UPDATE SET
        team_id = EXCLUDED.team_id, name = EXCLUDED.name, real_name = EXCLUDED.real_name,
        avatar = EXCLUDED.avatar, is_bot = EXCLUDED.is_bot,
        deleted = EXCLUDED.deleted, updated_at = now()
    `;
  }
  return users.length;
}

async function userNames(teamId: string): Promise<Map<string, string>> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, name, real_name FROM archive_users WHERE team_id = ${teamId}
  `) as { id: string; name: string; real_name: string }[];
  return new Map(rows.map((row) => [row.id, row.real_name || row.name || row.id]));
}

/** Joins every public channel the bot isn't in yet, and records them all. */
async function syncChannelList(workspace: Workspace, token: string, deadline: number) {
  const sql = getSql();
  const channels = await listPublicChannels({ token, deadline });
  for (const channel of channels) {
    if (!channel.is_member && !channel.is_archived) {
      try {
        await slackPost("conversations.join", { channel: channel.id }, { token, deadline });
      } catch {
        // Not fatal — we just can't read this one until someone invites the bot.
      }
    }
    await upsertChannel(channel);
  }
  return channels.length;

  async function upsertChannel(channel: SlackChannel) {
    await sql`
      INSERT INTO archive_channels (id, team_id, name, purpose, topic, is_private, is_archived,
                                    synced_through_ts, updated_at)
      VALUES (${channel.id}, ${workspace.teamId}, ${channel.name},
              ${channel.purpose?.value ?? ""}, ${channel.topic?.value ?? ""},
              ${Boolean(channel.is_private)}, ${Boolean(channel.is_archived)},
              ${tsSecondsAgo(COLD_START_DAYS)}, now())
      ON CONFLICT (id) DO UPDATE SET
        team_id = EXCLUDED.team_id, name = EXCLUDED.name, purpose = EXCLUDED.purpose,
        topic = EXCLUDED.topic, is_archived = EXCLUDED.is_archived, updated_at = now()
    `;
  }
}

async function storeMessages(
  channelId: string,
  messages: SlackMessage[],
  names: Map<string, string>
) {
  if (!messages.length) return;
  const sql = getSql();
  const author = (message: SlackMessage) =>
    message.user && names.get(message.user)
      ? names.get(message.user)!
      : message.username ?? message.user ?? message.bot_id ?? "";

  for (let start = 0; start < messages.length; start += MESSAGE_CHUNK) {
    const chunk = messages.slice(start, start + MESSAGE_CHUNK);
    await sql`
      INSERT INTO archive_messages (channel_id, ts, thread_ts, user_id, user_name, subtype,
                                    text, reactions, reply_count, posted_at, edited_at, raw)
      SELECT ${channelId}, ts, thread_ts, user_id, user_name, subtype, text, reactions,
             reply_count, posted_at::timestamptz, edited_at::timestamptz, raw
      FROM UNNEST(
        ${chunk.map((m) => m.ts)}::text[],
        ${chunk.map((m) => m.thread_ts ?? null)}::text[],
        ${chunk.map((m) => m.user ?? m.bot_id ?? "")}::text[],
        ${chunk.map(author)}::text[],
        ${chunk.map((m) => m.subtype ?? "")}::text[],
        ${chunk.map((m) => m.text ?? "")}::text[],
        ${chunk.map((m) => JSON.stringify(m.reactions ?? []))}::jsonb[],
        ${chunk.map((m) => m.reply_count ?? 0)}::int[],
        ${chunk.map((m) => postedAt(m.ts))}::text[],
        ${chunk.map((m) => (m.edited ? postedAt(m.edited.ts) : null))}::text[],
        ${chunk.map((m) => JSON.stringify(m))}::jsonb[]
      ) AS t(ts, thread_ts, user_id, user_name, subtype, text, reactions,
             reply_count, posted_at, edited_at, raw)
      ON CONFLICT (channel_id, ts) DO UPDATE SET
        text = EXCLUDED.text, reactions = EXCLUDED.reactions,
        reply_count = EXCLUDED.reply_count, edited_at = EXCLUDED.edited_at,
        user_name = EXCLUDED.user_name, raw = EXCLUDED.raw
    `;
  }
}

/** Copies a Slack-hosted file into Blob so it outlives Slack's retention. */
async function mirrorFile(
  channelId: string,
  messageTs: string,
  file: SlackFile,
  token: string
) {
  const sql = getSql();
  const existing = (await sql`
    SELECT mirrored FROM archive_files WHERE id = ${file.id}
  `) as { mirrored: boolean }[];
  if (existing[0]?.mirrored) return false;

  let blobUrl = "";
  let blobPathname = "";
  let mirrored = false;
  const oversized = (file.size ?? 0) > sizeLimit(file.mimetype ?? "");
  const body = oversized ? null : await downloadFile(file, token);
  if (body) {
    const name = file.name ?? file.title ?? file.id;
    try {
      // Private access: the blob is readable only with the store token, so the
      // archive's own route is the single way in.
      const uploaded = await put(`slack-archive/${channelId}/${file.id}/${name}`, body, {
        access: "private",
        addRandomSuffix: true,
        contentType: file.mimetype,
      });
      blobUrl = uploaded.url;
      blobPathname = uploaded.pathname;
      mirrored = true;
    } catch (error) {
      // A full store must not fail the sync — messages matter more than
      // attachments, and the file row is still recorded for a later retry.
      if (String(error).includes("quota")) throw new StorageFull(String(error));
      throw error;
    }
  }

  await sql`
    INSERT INTO archive_files (id, channel_id, message_ts, name, mimetype, size,
                               blob_url, blob_pathname, slack_permalink, mirrored)
    VALUES (${file.id}, ${channelId}, ${messageTs}, ${file.name ?? file.title ?? ""},
            ${file.mimetype ?? ""}, ${file.size ?? 0}, ${blobUrl}, ${blobPathname},
            ${file.permalink ?? ""}, ${mirrored})
    ON CONFLICT (id) DO UPDATE SET
      blob_url = EXCLUDED.blob_url, blob_pathname = EXCLUDED.blob_pathname,
      mirrored = EXCLUDED.mirrored, size = EXCLUDED.size, mimetype = EXCLUDED.mimetype
  `;
  return mirrored;
}

async function ingest(channelId: string, messages: SlackMessage[], run: Run) {
  await storeMessages(channelId, messages, run.names);
  run.counters.messages += messages.length;
  for (const message of messages) {
    for (const file of message.files ?? []) {
      if (run.storageFull) {
        run.counters.skipped += 1;
        continue;
      }
      try {
        if (await mirrorFile(channelId, message.ts, file, run.token)) run.counters.files += 1;
      } catch (error) {
        if (!(error instanceof StorageFull)) throw error;
        run.storageFull = true;
        run.counters.skipped += 1;
      }
    }
  }
}

/**
 * Retries files we recorded but could not copy — most often because the app
 * lacked files:read at the time. Slack still has to be holding the file.
 */
async function mirrorPendingFiles(run: Run, limit = 50) {
  const sql = getSql();
  const pending = (await sql`
    SELECT f.id, f.channel_id, f.message_ts, m.raw
    FROM archive_files f
    JOIN archive_messages m ON m.channel_id = f.channel_id AND m.ts = f.message_ts
    JOIN archive_channels c ON c.id = f.channel_id
    WHERE NOT f.mirrored AND c.team_id = ${run.workspace.teamId}
    ORDER BY m.posted_at DESC
    LIMIT ${limit}
  `) as unknown as {
    id: string;
    channel_id: string;
    message_ts: string;
    raw: { files?: SlackFile[] };
  }[];

  for (const row of pending) {
    if (Date.now() >= run.deadline) throw new BudgetExceeded("mirrorPendingFiles");
    if (run.storageFull) return;
    const file = (row.raw.files ?? []).find((candidate) => candidate.id === row.id);
    if (!file) continue;
    try {
      if (await mirrorFile(row.channel_id, row.message_ts, file, run.token)) {
        run.counters.files += 1;
      }
    } catch (error) {
      if (!(error instanceof StorageFull)) throw error;
      run.storageFull = true;
      run.counters.skipped += 1;
    }
  }
}

async function syncChannel(channel: ChannelRow, run: Run) {
  const sql = getSql();
  const windowStart =
    channel.sync_window_start ?? channel.synced_through_ts ?? tsSecondsAgo(COLD_START_DAYS);
  let cursor = channel.sync_cursor ?? undefined;
  const auth = { token: run.token, deadline: run.deadline };

  for (;;) {
    const page = await slackGet<{
      messages: SlackMessage[];
      has_more?: boolean;
      response_metadata?: { next_cursor?: string };
    }>(
      "conversations.history",
      { channel: channel.id, oldest: windowStart, limit: 200, cursor, inclusive: "false" },
      auth
    );

    await ingest(channel.id, page.messages ?? [], run);

    // Thread replies live outside conversations.history.
    for (const message of page.messages ?? []) {
      if (!message.reply_count) continue;
      if (message.latest_reply && Number(message.latest_reply) <= Number(windowStart)) continue;
      const thread = await slackGet<{ messages: SlackMessage[] }>(
        "conversations.replies",
        { channel: channel.id, ts: message.ts, limit: 200 },
        auth
      );
      await ingest(channel.id, (thread.messages ?? []).slice(1), run);
    }

    cursor = page.response_metadata?.next_cursor || undefined;

    if (cursor) {
      // Checkpoint mid-walk so the next invocation picks up where we stopped.
      await sql`
        UPDATE archive_channels
        SET sync_cursor = ${cursor}, sync_window_start = ${windowStart}, updated_at = now()
        WHERE id = ${channel.id}
      `;
      continue;
    }

    // Walk finished: advance the watermark to the newest message we hold.
    const newest = (await sql`
      SELECT ts FROM archive_messages WHERE channel_id = ${channel.id}
      ORDER BY ts::numeric DESC LIMIT 1
    `) as { ts: string }[];
    const count = (await sql`
      SELECT COUNT(*)::int AS n FROM archive_messages WHERE channel_id = ${channel.id}
    `) as { n: number }[];
    await sql`
      UPDATE archive_channels
      SET synced_through_ts = ${newest[0]?.ts ?? windowStart},
          sync_cursor = NULL, sync_window_start = NULL,
          message_count = ${count[0]?.n ?? 0},
          last_synced_at = now(), last_error = NULL, updated_at = now()
      WHERE id = ${channel.id}
    `;
    return;
  }
}

type WorkspaceResult = {
  workspace: string;
  channels_discovered: number;
  channels_completed: string[];
  messages_archived: number;
  files_mirrored: number;
  files_skipped: number;
  storage_full: boolean;
  failed: { channel: string; error: string }[];
  resumable: boolean;
};

async function syncWorkspace(
  workspace: Workspace,
  deadline: number,
  only: string | null
): Promise<WorkspaceResult> {
  const sql = getSql();
  const token = botToken(workspace);
  const counters: Counters = { messages: 0, files: 0, skipped: 0 };
  const done: string[] = [];
  const failed: { channel: string; error: string }[] = [];
  let budgetHit = false;
  let channelsSeen = 0;

  try {
    await refreshUsers(workspace, token, deadline);
    // Discovering channels is cheap; skip it when syncing one channel by hand.
    if (!only) channelsSeen = await syncChannelList(workspace, token, deadline);
  } catch (error) {
    if (!(error instanceof BudgetExceeded)) throw error;
    budgetHit = true;
  }

  const run: Run = {
    workspace,
    token,
    names: await userNames(workspace.teamId),
    deadline,
    counters,
    storageFull: false,
  };

  // Channels with a checkpoint go first, then the least recently synced.
  const queue = (await sql`
    SELECT id, name, synced_through_ts, sync_cursor, sync_window_start
    FROM archive_channels
    WHERE team_id = ${workspace.teamId}
      AND NOT is_archived
      AND (${only}::text IS NULL OR name = ${only} OR id = ${only})
    ORDER BY (sync_cursor IS NULL), last_synced_at ASC NULLS FIRST
  `) as unknown as ChannelRow[];

  for (const channel of queue) {
    if (budgetHit || Date.now() >= deadline) {
      budgetHit = true;
      break;
    }
    try {
      await syncChannel(channel, run);
      done.push(channel.name);
    } catch (error) {
      if (error instanceof BudgetExceeded) {
        budgetHit = true;
        break;
      }
      const message = String(error);
      failed.push({ channel: channel.name, error: message });
      await sql`
        UPDATE archive_channels SET last_error = ${message.slice(0, 500)}, updated_at = now()
        WHERE id = ${channel.id}
      `;
    }
  }

  // Anything left unmirrored from earlier runs gets another chance with
  // whatever budget survived the channel walk.
  if (!budgetHit && Date.now() < deadline) {
    try {
      await mirrorPendingFiles(run);
    } catch (error) {
      if (error instanceof BudgetExceeded) budgetHit = true;
      else failed.push({ channel: "(file backfill)", error: String(error) });
    }
  }

  return {
    workspace: workspace.slug,
    channels_discovered: channelsSeen,
    channels_completed: done,
    messages_archived: counters.messages,
    files_mirrored: counters.files,
    files_skipped: counters.skipped,
    storage_full: run.storageFull,
    failed,
    // True when we stopped early — Slack rate limits or the function's time
    // budget. The next run resumes from the stored cursor.
    resumable: budgetHit,
  };
}

export async function GET(request: NextRequest) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const budget = Number(
    params.get("budget") ?? process.env.ARCHIVE_SYNC_BUDGET_MS ?? DEFAULT_BUDGET_MS
  );
  const only = params.get("channel");
  const wanted = params.get("workspace");

  const workspaces = wanted
    ? [workspaceBySlug(wanted)].filter((entry): entry is Workspace => Boolean(entry))
    : syncableWorkspaces();
  if (!workspaces.length) {
    return NextResponse.json({ error: "no_syncable_workspace" }, { status: 400 });
  }

  // Each workspace gets an equal slice, so a busy one cannot starve the others.
  const slice = Math.floor(budget / workspaces.length);
  const results: WorkspaceResult[] = [];
  for (const workspace of workspaces) {
    try {
      results.push(await syncWorkspace(workspace, Date.now() + slice, only));
    } catch (error) {
      results.push({
        workspace: workspace.slug,
        channels_discovered: 0,
        channels_completed: [],
        messages_archived: 0,
        files_mirrored: 0,
        files_skipped: 0,
        storage_full: false,
        failed: [{ channel: "(workspace)", error: String(error) }],
        resumable: true,
      });
    }
  }

  return NextResponse.json({ ok: true, results });
}
