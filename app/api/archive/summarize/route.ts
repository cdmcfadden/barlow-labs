import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SESSION_COOKIE, openSession } from "@/lib/session";
import { getSql } from "@/lib/db";
import { userNameMap } from "@/lib/archive";

// Hobby plan caps functions at 60s; the sync is checkpointed, so a run that
// hits the ceiling simply resumes from its cursor on the next invocation.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MODEL = "claude-opus-5";
// One month of one channel per API call. They run concurrently, so the batch
// size is bounded by the 60s function ceiling rather than by their sum.
const DEFAULT_BATCH = 4;

const SYSTEM = `You write the monthly summary pages for a private Slack archive
belonging to Barlow Labs, a small Seattle startup/builder group working on
computer vision for human movement, robotics, and assorted side projects.

You are given one month of one channel's messages. Write a summary that lets a
member who missed the month catch up, and that lets someone searching in two
years find what they need.

Rules:
- Lead with a two or three sentence overview of what the month was about.
- Then "## Threads that mattered" as a bullet list: what was discussed, who
  drove it, and what was decided or built. Name people by the display names in
  the transcript.
- Then "## Decisions" and "## Open questions" as bullet lists. Omit either
  heading if the month genuinely had none.
- Be concrete about projects, numbers, links and tools mentioned. Do not
  invent anything that is not in the transcript.
- Markdown headings and bullets only. No preamble, no sign-off.`;

async function authorize(request: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth === `Bearer ${secret}`) return true;
  return Boolean(await openSession(request.cookies.get(SESSION_COOKIE)?.value));
}

type Pending = { channel_id: string; name: string; month: string; message_count: number };

/** Slack stores mentions as <@U123>; the model should see people, not ids. */
function resolveMentions(text: string, names: Map<string, string>): string {
  return text.replace(/<@([A-Z0-9]+)(\|[^>]*)?>/g, (_match, id: string) => `@${names.get(id) ?? id}`);
}

export async function GET(request: NextRequest) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set" }, { status: 500 });
  }

  const sql = getSql();
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? DEFAULT_BATCH);
  const only = request.nextUrl.searchParams.get("channel");

  // A month needs (re)summarizing when it has no summary, or when messages
  // have landed since the summary was written.
  const pending = (await sql`
    SELECT m.channel_id, c.name, to_char(m.posted_at, 'YYYY-MM') AS month,
           COUNT(*)::int AS message_count
    FROM archive_messages m
    JOIN archive_channels c ON c.id = m.channel_id
    LEFT JOIN archive_summaries s
      ON s.channel_id = m.channel_id AND s.month = to_char(m.posted_at, 'YYYY-MM')
    WHERE (${only}::text IS NULL OR c.name = ${only} OR c.id = ${only})
    GROUP BY m.channel_id, c.name, 3, s.message_count
    HAVING MAX(s.message_count) IS NULL OR MAX(s.message_count) <> COUNT(*)
    ORDER BY 3 DESC
    LIMIT ${limit}
  `) as unknown as Pending[];

  const client = new Anthropic();
  const names = await userNameMap();

  async function summarize(item: Pending): Promise<string | null> {
    const messages = (await sql`
      SELECT to_char(posted_at, 'YYYY-MM-DD HH24:MI') AS at, user_name, text, thread_ts, ts
      FROM archive_messages
      WHERE channel_id = ${item.channel_id}
        AND to_char(posted_at, 'YYYY-MM') = ${item.month}
        AND text <> ''
      ORDER BY ts ASC
    `) as unknown as {
      at: string;
      user_name: string;
      text: string;
      thread_ts: string | null;
      ts: string;
    }[];

    const transcript = messages
      .map((row) => {
        const threaded = row.thread_ts && row.thread_ts !== row.ts ? "  ↳ " : "";
        return `${threaded}[${row.at}] ${row.user_name}: ${resolveMentions(row.text, names)}`;
      })
      .join("\n");

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      // Medium effort keeps a month's summary inside the function's ceiling;
      // these transcripts don't need deep reasoning.
      output_config: { effort: "medium" },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Channel: #${item.name}\nMonth: ${item.month}\nMessages: ${messages.length}\n\n<transcript>\n${transcript}\n</transcript>`,
        },
      ],
    });

    const summary = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();
    if (!summary) return null;

    await sql`
      INSERT INTO archive_summaries (channel_id, month, summary, message_count, model, generated_at)
      VALUES (${item.channel_id}, ${item.month}, ${summary}, ${item.message_count}, ${MODEL}, now())
      ON CONFLICT (channel_id, month) DO UPDATE SET
        summary = EXCLUDED.summary, message_count = EXCLUDED.message_count,
        model = EXCLUDED.model, generated_at = now()
    `;
    return `#${item.name} ${item.month}`;
  }

  // Concurrent so a batch costs one call's latency, not four.
  const results = await Promise.allSettled(pending.map(summarize));
  const written = results
    .filter((result): result is PromiseFulfilledResult<string> =>
      result.status === "fulfilled" && Boolean(result.value)
    )
    .map((result) => result.value);
  const errors = results
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) => String(result.reason));

  return NextResponse.json({
    ok: true,
    summarized: written,
    failed: errors,
    remaining: pending.length - written.length,
  });
}
