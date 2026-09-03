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

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Free-plan Slack stops returning history at ~90 days. We start a cold channel
// a little inside that edge so the first run doesn't chase messages Slack has
// already dropped.
const COLD_START_DAYS = 88;
const DEFAULT_BUDGET_MS = 50_000;
const USER_REFRESH_HOURS = 12;
// Screen recordings can run to hundreds of MB; skip the outliers rather than
// quietly filling the Blob store. Their metadata is still archived.
const MAX_FILE_MB = Number(process.env.ARCHIVE_MAX_FILE_MB ?? 200);

type ChannelRow = {
  id: string;
  name: string;
  synced_through_ts: string;
  sync_cursor: string | null;
  sync_window_start: string | null;
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

async function refreshUsers(deadline: number) {
  const sql = getSql();
  const rows = (await sql`
    SELECT MAX(updated_at) AS updated_at FROM archive_users
  `) as { updated_at: string | null }[];
  const last = rows[0]?.updated_at ? new Date(rows[0].updated_at).getTime() : 0;
  if (Date.now() - last < USER_REFRESH_HOURS * 3600 * 1000) return 0;

  const users = await fetchUsers({ deadline });
  for (const user of users) {
    await sql`
      INSERT INTO archive_users (id, name, real_name, avatar, is_bot, deleted, updated_at)
      VALUES (${user.id}, ${user.name ?? ""},
              ${user.profile?.real_name ?? user.real_name ?? ""},
              ${user.profile?.image_72 ?? ""}, ${Boolean(user.is_bot)},
              ${Boolean(user.deleted)}, now())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, real_name = EXCLUDED.real_name,
        avatar = EXCLUDED.avatar, is_bot = EXCLUDED.is_bot,
        deleted = EXCLUDED.deleted, updated_at = now()
    `;
  }
  return users.length;
}

async function userNames(): Promise<Map<string, string>> {
  const sql = getSql();
  const rows = (await sql`SELECT id, name, real_name FROM archive_users`) as {
    id: string;
    name: string;
    real_name: string;
  }[];
  return new Map(rows.map((row) => [row.id, row.real_name || row.name || row.id]));
}

/** Joins every public channel Theo isn't in yet, and records them all. */
async function syncChannelList(deadline: number) {
  const sql = getSql();
  const channels = await listPublicChannels({ deadline });
  for (const channel of channels) {
    if (!channel.is_member && !channel.is_archived) {
      try {
        await slackPost("conversations.join", { channel: channel.id }, { deadline });
      } catch {
        // Not fatal — we just can't read this one until someone invites Theo.
      }
    }
    await upsertChannel(channel);
  }
  return channels.length;

  async function upsertChannel(channel: SlackChannel) {
    await sql`
      INSERT INTO archive_channels (id, name, purpose, topic, is_private, is_archived,
                                    synced_through_ts, updated_at)
      VALUES (${channel.id}, ${channel.name}, ${channel.purpose?.value ?? ""},
              ${channel.topic?.value ?? ""}, ${Boolean(channel.is_private)},
              ${Boolean(channel.is_archived)}, ${tsSecondsAgo(COLD_START_DAYS)}, now())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, purpose = EXCLUDED.purpose, topic = EXCLUDED.topic,
        is_archived = EXCLUDED.is_archived, updated_at = now()
    `;
  }
}

async function storeMessage(
  channelId: string,
  message: SlackMessage,
  names: Map<string, string>
) {
  const sql = getSql();
  const author =
    message.user && names.get(message.user)
      ? names.get(message.user)!
      : message.username ?? message.user ?? message.bot_id ?? "";

  await sql`
    INSERT INTO archive_messages (channel_id, ts, thread_ts, user_id, user_name, subtype,
                                  text, reactions, reply_count, posted_at, edited_at, raw)
    VALUES (${channelId}, ${message.ts}, ${message.thread_ts ?? null},
            ${message.user ?? message.bot_id ?? ""}, ${author}, ${message.subtype ?? ""},
            ${message.text ?? ""},
            ${JSON.stringify(message.reactions ?? [])}::jsonb,
            ${message.reply_count ?? 0}, ${postedAt(message.ts)},
            ${message.edited ? postedAt(message.edited.ts) : null},
            ${JSON.stringify(message)}::jsonb)
    ON CONFLICT (channel_id, ts) DO UPDATE SET
      text = EXCLUDED.text, reactions = EXCLUDED.reactions,
      reply_count = EXCLUDED.reply_count, edited_at = EXCLUDED.edited_at,
      user_name = EXCLUDED.user_name, raw = EXCLUDED.raw
  `;
}

/** Copies a Slack-hosted file into Blob so it outlives Slack's retention. */
async function mirrorFile(channelId: string, messageTs: string, file: SlackFile) {
  const sql = getSql();
  const existing = (await sql`
    SELECT mirrored FROM archive_files WHERE id = ${file.id}
  `) as { mirrored: boolean }[];
  if (existing[0]?.mirrored) return false;

  let blobUrl = "";
  let blobPathname = "";
  let mirrored = false;
  const oversized = (file.size ?? 0) > MAX_FILE_MB * 1024 * 1024;
  const body = oversized ? null : await downloadFile(file);
  if (body) {
    const name = file.name ?? file.title ?? file.id;
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

async function ingest(
  channelId: string,
  messages: SlackMessage[],
  names: Map<string, string>,
  counters: { messages: number; files: number }
) {
  for (const message of messages) {
    await storeMessage(channelId, message, names);
    counters.messages += 1;
    for (const file of message.files ?? []) {
      if (await mirrorFile(channelId, message.ts, file)) counters.files += 1;
    }
  }
}

/**
 * Retries files we recorded but could not copy — most often because the app
 * lacked files:read at the time. Slack still has to be holding the file.
 */
async function mirrorPendingFiles(
  deadline: number,
  counters: { messages: number; files: number },
  limit = 50
) {
  const sql = getSql();
  const pending = (await sql`
    SELECT f.id, f.channel_id, f.message_ts, m.raw
    FROM archive_files f
    JOIN archive_messages m ON m.channel_id = f.channel_id AND m.ts = f.message_ts
    WHERE NOT f.mirrored
    ORDER BY m.posted_at DESC
    LIMIT ${limit}
  `) as unknown as {
    id: string;
    channel_id: string;
    message_ts: string;
    raw: { files?: SlackFile[] };
  }[];

  for (const row of pending) {
    if (Date.now() >= deadline) throw new BudgetExceeded("mirrorPendingFiles");
    const file = (row.raw.files ?? []).find((candidate) => candidate.id === row.id);
    if (!file) continue;
    if (await mirrorFile(row.channel_id, row.message_ts, file)) counters.files += 1;
  }
}

async function syncChannel(
  channel: ChannelRow,
  names: Map<string, string>,
  deadline: number,
  counters: { messages: number; files: number }
) {
  const sql = getSql();
  const windowStart =
    channel.sync_window_start ?? channel.synced_through_ts ?? tsSecondsAgo(COLD_START_DAYS);
  let cursor = channel.sync_cursor ?? undefined;

  for (;;) {
    const page = await slackGet<{
      messages: SlackMessage[];
      has_more?: boolean;
      response_metadata?: { next_cursor?: string };
    }>(
      "conversations.history",
      { channel: channel.id, oldest: windowStart, limit: 200, cursor, inclusive: "false" },
      { deadline }
    );

    await ingest(channel.id, page.messages ?? [], names, counters);

    // Thread replies live outside conversations.history.
    for (const message of page.messages ?? []) {
      if (!message.reply_count) continue;
      if (message.latest_reply && Number(message.latest_reply) <= Number(windowStart)) continue;
      const thread = await slackGet<{ messages: SlackMessage[] }>(
        "conversations.replies",
        { channel: channel.id, ts: message.ts, limit: 200 },
        { deadline }
      );
      await ingest(channel.id, (thread.messages ?? []).slice(1), names, counters);
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

export async function GET(request: NextRequest) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const budget = Number(
    request.nextUrl.searchParams.get("budget") ??
      process.env.ARCHIVE_SYNC_BUDGET_MS ??
      DEFAULT_BUDGET_MS
  );
  const deadline = Date.now() + budget;
  const only = request.nextUrl.searchParams.get("channel");
  const sql = getSql();
  const counters = { messages: 0, files: 0 };
  const done: string[] = [];
  const failed: { channel: string; error: string }[] = [];
  let budgetHit = false;
  let channelsSeen = 0;

  try {
    await refreshUsers(deadline);
    // Discovering channels is cheap; skip it when syncing one channel by hand.
    if (!only) channelsSeen = await syncChannelList(deadline);
  } catch (error) {
    if (!(error instanceof BudgetExceeded)) {
      return NextResponse.json({ error: String(error) }, { status: 500 });
    }
    budgetHit = true;
  }

  const names = await userNames();

  // Channels with a checkpoint go first, then the least recently synced.
  const queue = (await sql`
    SELECT id, name, synced_through_ts, sync_cursor, sync_window_start
    FROM archive_channels
    WHERE NOT is_archived
      AND (${only}::text IS NULL OR name = ${only} OR id = ${only})
    ORDER BY (sync_cursor IS NULL), last_synced_at ASC NULLS FIRST
  `) as unknown as ChannelRow[];

  for (const channel of queue) {
    if (budgetHit || Date.now() >= deadline) {
      budgetHit = true;
      break;
    }
    try {
      await syncChannel(channel, names, deadline, counters);
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
      await mirrorPendingFiles(deadline, counters);
    } catch (error) {
      if (error instanceof BudgetExceeded) budgetHit = true;
      else failed.push({ channel: "(file backfill)", error: String(error) });
    }
  }

  return NextResponse.json({
    ok: true,
    channels_discovered: channelsSeen,
    channels_completed: done,
    messages_archived: counters.messages,
    files_mirrored: counters.files,
    failed,
    // True when we stopped early — Slack rate limits or the function's time
    // budget. The next run resumes from the stored cursor.
    resumable: budgetHit,
  });
}
