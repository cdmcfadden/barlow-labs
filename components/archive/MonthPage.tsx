import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getChannelByName,
  getMonthSummary,
  listMonthFiles,
  listMonthMessages,
  renderMrkdwn,
  userNameMap,
  type ArchiveFile,
  type ArchiveMessage,
} from "@/lib/archive";
import type { Workspace } from "@/lib/workspaces";
import Markdown from "./Markdown";
import { monthLabel } from "./ChannelPage";

function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function dayLabel(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Attachments({ files }: { files: ArchiveFile[] }) {
  if (!files.length) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {files.map((file) => (
        <li key={file.id}>
          {file.mirrored ? (
            <a
              href={`/api/archive/files/${file.id}`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-md border border-border px-2.5 py-1 text-xs hover:bg-muted"
            >
              <span>{file.name || "attachment"}</span>
              <span className="text-muted-foreground">{formatSize(file.size)}</span>
            </a>
          ) : file.slack_permalink ? (
            // Not stored — the name and size are archived, and Slack still
            // serves the file until retention catches up with it.
            <a
              href={file.slack_permalink}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-md border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
              title="Not stored in the archive — opens in Slack while it lasts"
            >
              <span>{file.name || "attachment"}</span>
              <span>{formatSize(file.size)} · Slack</span>
            </a>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-md border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground">
              {file.name || "attachment"} (not stored)
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function Message({
  message,
  names,
  files,
  indented,
}: {
  message: ArchiveMessage;
  names: Map<string, string>;
  files: ArchiveFile[];
  indented?: boolean;
}) {
  return (
    <div
      id={message.ts}
      className={indented ? "border-l-2 border-border pl-4" : undefined}
    >
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-medium">{message.user_name || "unknown"}</span>
        <span className="text-xs text-muted-foreground">{timeLabel(message.posted_at)}</span>
        {message.edited_at && <span className="text-xs text-muted-foreground">(edited)</span>}
      </div>
      <div
        className="mt-0.5 text-sm leading-relaxed text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: renderMrkdwn(message.text, names) }}
      />
      <Attachments files={files} />
      {message.reactions?.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {message.reactions.map((reaction) => (
            <span
              key={reaction.name}
              className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground"
            >
              :{reaction.name}: {reaction.count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function MonthPage({
  workspace,
  channelName,
  month,
}: {
  workspace: Workspace;
  channelName: string;
  month: string;
}) {
  const channel = await getChannelByName(workspace.teamId, decodeURIComponent(channelName));
  if (!channel) notFound();

  const [messages, files, summary, names] = await Promise.all([
    listMonthMessages(channel.id, month),
    listMonthFiles(channel.id, month),
    getMonthSummary(channel.id, month),
    userNameMap(workspace.teamId),
  ]);
  if (!messages.length) notFound();

  const filesByMessage = new Map<string, ArchiveFile[]>();
  for (const file of files) {
    filesByMessage.set(file.message_ts, [...(filesByMessage.get(file.message_ts) ?? []), file]);
  }

  const replies = new Map<string, ArchiveMessage[]>();
  const roots: ArchiveMessage[] = [];
  for (const message of messages) {
    if (message.thread_ts && message.thread_ts !== message.ts) {
      replies.set(message.thread_ts, [...(replies.get(message.thread_ts) ?? []), message]);
    } else {
      roots.push(message);
    }
  }

  const days: { key: string; messages: ArchiveMessage[] }[] = [];
  for (const message of roots) {
    const key = dayKey(message.posted_at);
    const last = days[days.length - 1];
    if (last?.key === key) last.messages.push(message);
    else days.push({ key, messages: [message] });
  }

  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-sm text-muted-foreground">
        <Link href={workspace.basePath} className="underline underline-offset-4">
          Slack archive
        </Link>{" "}
        /{" "}
        <Link href={`${workspace.basePath}/${channel.name}`} className="underline underline-offset-4">
          #{channel.name}
        </Link>{" "}
        / {monthLabel(month)}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        #{channel.name} — {monthLabel(month)}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {messages.length.toLocaleString()} messages
      </p>

      {summary && (
        <div className="mt-8 rounded-lg border border-border bg-muted/30 p-6">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground">
            Summary of the month
          </h2>
          <div className="mt-3">
            <Markdown text={summary.summary} />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Written by {summary.model} from the transcript below — the messages are the record.
          </p>
        </div>
      )}

      <div className="mt-12 space-y-10">
        {days.map((day) => (
          <div key={day.key}>
            <h2 className="sticky top-0 border-b border-border bg-background/90 py-2 text-sm font-medium backdrop-blur">
              {dayLabel(day.key)}
            </h2>
            <div className="mt-4 space-y-5">
              {day.messages.map((message) => (
                <div key={message.ts} className="space-y-3">
                  <Message
                    message={message}
                    names={names}
                    files={filesByMessage.get(message.ts) ?? []}
                  />
                  {(replies.get(message.ts) ?? []).map((reply) => (
                    <Message
                      key={reply.ts}
                      message={reply}
                      names={names}
                      files={filesByMessage.get(reply.ts) ?? []}
                      indented
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
