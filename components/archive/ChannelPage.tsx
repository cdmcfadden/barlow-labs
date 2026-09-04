import Link from "next/link";
import { notFound } from "next/navigation";
import { getChannelByName, listChannelMonths, plainText } from "@/lib/archive";
import type { Workspace } from "@/lib/workspaces";

export function monthLabel(month: string): string {
  const [year, index] = month.split("-").map(Number);
  return new Date(year, index - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export default async function ChannelPage({
  workspace,
  channelName,
}: {
  workspace: Workspace;
  channelName: string;
}) {
  const channel = await getChannelByName(workspace.teamId, decodeURIComponent(channelName));
  if (!channel) notFound();

  const months = await listChannelMonths(channel.id);

  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-sm text-muted-foreground">
        <Link href={workspace.basePath} className="underline underline-offset-4">
          Slack archive
        </Link>{" "}
        / #{channel.name}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">#{channel.name}</h1>
      {channel.purpose && <p className="mt-4 max-w-2xl text-muted-foreground">{plainText(channel.purpose)}</p>}

      <ul className="mt-10 space-y-3">
        {months.map((month) => (
          <li key={month.month} className="rounded-lg border border-border p-5">
            <div className="flex items-baseline justify-between gap-4">
              <Link
                href={`${workspace.basePath}/${channel.name}/${month.month}`}
                className="text-lg font-medium underline-offset-4 hover:underline"
              >
                {monthLabel(month.month)}
              </Link>
              <span className="shrink-0 text-sm text-muted-foreground">
                {month.message_count.toLocaleString()} messages · {month.people} people
              </span>
            </div>
            {month.summary ? (
              <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                {month.summary.replace(/^#+\s.*$/gm, "").replace(/\s+/g, " ").trim()}
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Summary not generated yet.</p>
            )}
          </li>
        ))}
      </ul>

      {months.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">No messages archived for this channel.</p>
      )}
    </section>
  );
}
