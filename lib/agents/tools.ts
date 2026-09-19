import type Anthropic from "@anthropic-ai/sdk";
import { slackGet, type SlackChannel, type SlackMessage } from "@/lib/slack";

// The assistants' only way to see Slack. Every tool reads public channels the
// bot has joined, so an answer can never quote a DM or private channel to
// someone who couldn't see it.

const HISTORY_MAX_DAYS = 30;
const HISTORY_MAX_MESSAGES = 200;
const CHANNEL_CACHE_MS = 5 * 60_000;

type Tool = Anthropic.Beta.BetaTool;

const channelProp = { type: "string", description: "Channel ID, name, or #name" } as const;

export const SLACK_TOOLS: Tool[] = [
  {
    name: "list_channels",
    description: "List the public channels I've joined, with their purpose.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_channel_history",
    description: "Read recent messages from a public channel, oldest first.",
    input_schema: {
      type: "object",
      properties: {
        channel: channelProp,
        days: { type: "integer", description: `How far back, 1-${HISTORY_MAX_DAYS} (default 7)` },
        limit: { type: "integer", description: `Max messages, 1-${HISTORY_MAX_MESSAGES} (default 100)` },
      },
      required: ["channel"],
    },
  },
  {
    name: "get_thread_replies",
    description: "Read a thread in a public channel.",
    input_schema: {
      type: "object",
      properties: { channel: channelProp, thread_ts: { type: "string", description: "The thread's parent ts" } },
      required: ["channel", "thread_ts"],
    },
  },
  {
    name: "get_user_profile",
    description: "Look up a member's name, title and time zone.",
    input_schema: {
      type: "object",
      properties: { user_id: { type: "string" } },
      required: ["user_id"],
    },
  },
];

type Message = SlackMessage & {
  attachments?: { pretext?: string; title?: string; text?: string; fields?: { title?: string; value?: string }[] }[];
  blocks?: { text?: { text?: string }; fields?: { text?: string }[] }[];
};

const channelCache = new Map<string, { at: number; channels: Map<string, SlackChannel> }>();
const nameCache = new Map<string, string>();

/** Slack only honours `oldest` with at most six decimal places; seven returns nothing. */
export const slackTs = (seconds: number) => seconds.toFixed(6);

export class SlackReader {
  constructor(readonly token: string) {}

  async channels(): Promise<Map<string, SlackChannel>> {
    const cached = channelCache.get(this.token);
    if (cached && Date.now() - cached.at < CHANNEL_CACHE_MS) return cached.channels;
    const channels = new Map<string, SlackChannel>();
    let cursor: string | undefined;
    do {
      const page = await slackGet<{ channels: SlackChannel[]; response_metadata?: { next_cursor?: string } }>(
        "conversations.list",
        { types: "public_channel", exclude_archived: "true", limit: 200, cursor },
        { token: this.token }
      );
      for (const c of page.channels) if (c.is_member && !c.is_private) channels.set(c.id, c);
      cursor = page.response_metadata?.next_cursor || undefined;
    } while (cursor);
    channelCache.set(this.token, { at: Date.now(), channels });
    return channels;
  }

  /** Accepts an ID, a name or #name; refuses anything but a joined public channel. */
  async channelId(channel: string): Promise<string> {
    const key = channel.trim().replace(/^#/, "");
    const channels = await this.channels();
    if (channels.has(key)) return key;
    for (const [id, c] of channels) if (c.name === key) return id;
    throw new ToolError(`'${channel}' isn't a public channel I've joined. Use list_channels to see which are.`);
  }

  async name(userId: string): Promise<string> {
    const key = `${this.token}:${userId}`;
    const cached = nameCache.get(key);
    if (cached) return cached;
    let name = userId;
    try {
      const { user } = await slackGet<{ user: { real_name?: string; profile?: { display_name?: string; real_name?: string } } }>(
        "users.info",
        { user: userId },
        { token: this.token }
      );
      name = user.profile?.display_name || user.profile?.real_name || user.real_name || userId;
    } catch {
      // Deleted or foreign users keep their ID.
    }
    nameCache.set(key, name);
    return name;
  }

  /** One line per message, with mentions turned into names. */
  async render(messages: Message[]): Promise<string> {
    const lines: string[] = [];
    for (const m of messages) {
      const when = new Date(Number(m.ts) * 1000).toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
        dateStyle: "medium",
        timeStyle: "short",
      });
      const who = m.user ? await this.name(m.user) : m.username ?? "bot";
      let text = m.text || bodyFallback(m);
      for (const id of new Set([...text.matchAll(/<@(U[A-Z0-9]+)(?:\|[^>]*)?>/g)].map((x) => x[1]))) {
        text = text.replace(new RegExp(`<@${id}(?:\\|[^>]*)?>`, "g"), `@${await this.name(id)}`);
      }
      let line = `[${when}] ${who}: ${text}`;
      if (m.reply_count) line += `  (${m.reply_count} replies, thread_ts=${m.ts})`;
      lines.push(line);
    }
    return lines.join("\n") || "(no messages)";
  }

  async history(channelId: string, days: number, limit: number): Promise<Message[]> {
    const { messages } = await slackGet<{ messages: Message[] }>(
      "conversations.history",
      { channel: channelId, oldest: slackTs(Date.now() / 1000 - days * 86400), limit },
      { token: this.token }
    );
    return messages.reverse();
  }

  async thread(channelId: string, threadTs: string, limit = HISTORY_MAX_MESSAGES): Promise<Message[]> {
    const { messages } = await slackGet<{ messages: Message[] }>(
      "conversations.replies",
      { channel: channelId, ts: threadTs, limit },
      { token: this.token }
    );
    return messages;
  }
}

/** Text for app-posted messages (e.g. backblasts) that keep it in attachments or blocks. */
function bodyFallback(m: Message): string {
  const parts: string[] = [];
  for (const a of m.attachments ?? []) {
    parts.push(...[a.pretext, a.title, a.text].filter((p): p is string => !!p));
    for (const f of a.fields ?? []) parts.push(`${f.title}: ${f.value}`);
  }
  for (const b of m.blocks ?? []) {
    if (b.text?.text) parts.push(b.text.text);
    for (const f of b.fields ?? []) if (f.text) parts.push(f.text);
  }
  return parts.join("\n");
}

export class ToolError extends Error {}

const clamp = (value: unknown, fallback: number, max: number) =>
  Math.max(1, Math.min(Number.isFinite(Number(value)) && Number(value) > 0 ? Math.floor(Number(value)) : fallback, max));

/** Runs one Slack tool call. Throws ToolError for problems the model should see. */
export async function runSlackTool(reader: SlackReader, name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "list_channels": {
      const rows = [...(await reader.channels()).values()]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => {
          const about = (c.purpose?.value || c.topic?.value || "").trim();
          return `${c.id} #${c.name}${about ? ` — ${about}` : ""}`;
        });
      return rows.join("\n") || "I haven't joined any public channels.";
    }
    case "get_channel_history": {
      const id = await reader.channelId(String(input.channel ?? ""));
      const messages = await reader.history(id, clamp(input.days, 7, HISTORY_MAX_DAYS), clamp(input.limit, 100, HISTORY_MAX_MESSAGES));
      return reader.render(messages);
    }
    case "get_thread_replies": {
      const id = await reader.channelId(String(input.channel ?? ""));
      return reader.render(await reader.thread(id, String(input.thread_ts ?? "")));
    }
    case "get_user_profile": {
      const { user } = await slackGet<{
        user: { tz_label?: string; profile?: { real_name?: string; display_name?: string; title?: string } };
      }>("users.info", { user: String(input.user_id ?? "") }, { token: reader.token });
      const fields: [string, string | undefined][] = [
        ["name", user.profile?.real_name],
        ["display name", user.profile?.display_name],
        ["title", user.profile?.title],
        ["time zone", user.tz_label],
      ];
      return fields.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n");
    }
    default:
      throw new ToolError(`${name} is not available.`);
  }
}
