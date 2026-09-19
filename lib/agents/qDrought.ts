import { slackGet, type SlackChannel } from "@/lib/slack";
import { slackTs } from "./tools";

// F3 "Q drought": which active PAX have gone longest without leading a
// workout. Built from F3 Nation backblasts in the #ao-* channels, which carry
// metadata.event_type = "backblast" and list *Q* and *PAX* as mentions.

const LOOKBACK_DAYS = 180;
const ACTIVE_DAYS = 90;
const TOP_N = 15;

const PATTERN =
  /(q.{0,8}drought|longest without q|haven.{0,3}t q.{0,3}d|gone the longest without q|who hasn.{0,3}t q|q.{0,8}dry spell|haven.{0,3}t led|longest since.*q)/i;

export const isQDroughtQuestion = (text: string) => PATTERN.test(text);

type Backblast = { ts: number; q: string[]; pax: string[] };
type Message = { ts: string; metadata?: { event_type?: string }; blocks?: { text?: { text?: string } }[] };

async function paginate<T>(
  token: string,
  method: string,
  params: Record<string, string | number | undefined>,
  key: string
): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | undefined;
  do {
    const page = await slackGet<Record<string, unknown> & { response_metadata?: { next_cursor?: string } }>(
      method,
      { ...params, limit: 200, cursor },
      { token }
    );
    items.push(...((page[key] as T[]) ?? []));
    cursor = page.response_metadata?.next_cursor || undefined;
  } while (cursor);
  return items;
}

function parseBackblast(m: Message): Backblast | null {
  if (m.metadata?.event_type !== "backblast") return null;
  const header = m.blocks?.[0]?.text?.text;
  if (!header) return null;
  let q: string[] = [];
  let pax: string[] = [];
  for (const line of header.split("\n").map((l) => l.trim())) {
    const ids = [...line.matchAll(/<@(U[A-Z0-9]+)>/g)].map((x) => x[1]);
    if (/^\*Q\*\s*:/i.test(line)) q = ids;
    else if (/^\*PAX\*\s*:/i.test(line)) pax = ids;
  }
  return q.length || pax.length ? { ts: Number(m.ts), q, pax } : null;
}

export async function qDroughtReport(token: string): Promise<string> {
  const now = Date.now() / 1000;
  const [members, channels] = await Promise.all([
    paginate<{ id: string; deleted?: boolean; is_bot?: boolean; profile?: { display_name?: string; real_name?: string } }>(
      token,
      "users.list",
      {},
      "members"
    ),
    paginate<SlackChannel>(token, "conversations.list", { types: "public_channel", exclude_archived: "true" }, "channels"),
  ]);
  const names = new Map(
    members.filter((u) => !u.deleted && !u.is_bot).map((u) => [u.id, u.profile?.display_name || u.profile?.real_name || u.id])
  );

  // Channels the bot can't read (not joined) come back empty rather than failing the report.
  const aoChannels = channels.filter((c) => c.name.startsWith("ao-"));
  const perChannel = await Promise.all(
    aoChannels.map((c) =>
      paginate<Message>(token, "conversations.history", { channel: c.id, oldest: slackTs(now - LOOKBACK_DAYS * 86400) }, "messages").catch(
        () => [] as Message[]
      )
    )
  );
  const backblasts = perChannel.flat().map(parseBackblast).filter((b): b is Backblast => b !== null);
  if (!backblasts.length) return "No backblast data found — couldn't compute Q drought stats.";

  const lastQ = new Map<string, number>();
  const active = new Set<string>();
  for (const b of backblasts) {
    if (b.ts >= now - ACTIVE_DAYS * 86400) for (const id of [...b.pax, ...b.q]) active.add(id);
    for (const id of b.q) lastQ.set(id, Math.max(lastQ.get(id) ?? 0, b.ts));
  }

  const rows = [...active]
    .map((id) => {
      const last = lastQ.get(id);
      return { name: names.get(id) ?? id, last, days: last ? Math.floor((now - last) / 86400) : LOOKBACK_DAYS };
    })
    .sort((a, b) => b.days - a.days);

  const lines = [`*Q Drought Rankings* (top ${Math.min(TOP_N, rows.length)} of ${rows.length} active PAX)`, ""];
  rows.slice(0, TOP_N).forEach((r, i) => {
    const when = r.last
      ? new Date(r.last * 1000).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric" })
      : null;
    lines.push(when ? `${i + 1}. *${r.name}* — ${r.days} days (last Q: ${when})` : `${i + 1}. *${r.name}* — ${LOOKBACK_DAYS}+ days (no Q on record)`);
  });
  lines.push("", `_Active = appeared in a backblast within the past ${ACTIVE_DAYS} days._`);
  return lines.join("\n");
}
