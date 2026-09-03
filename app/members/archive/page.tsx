import Link from "next/link";
import { archiveStats, listArchiveChannels } from "@/lib/archive";

export const metadata = { title: "Slack archive | Barlow Labs" };
export const dynamic = "force-dynamic";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ArchiveIndex() {
  const [channels, stats] = await Promise.all([listArchiveChannels(), archiveStats()]);
  const withMessages = channels.filter((channel) => channel.message_count > 0);

  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <p className="text-sm text-muted-foreground">
        <Link href="/members" className="underline underline-offset-4">
          Members
        </Link>{" "}
        / Slack archive
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Slack archive</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        Our Slack plan drops message history after 90 days. Everything here was mirrored
        before that happened, so it stays readable and searchable for good.
      </p>

      <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Messages", value: stats.messages.toLocaleString() },
          { label: "Channels", value: withMessages.length },
          { label: "Files kept", value: stats.files.toLocaleString() },
          { label: "Oldest", value: formatDate(stats.oldest) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border p-4">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              {stat.label}
            </dt>
            <dd className="mt-1 text-lg font-medium">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <form action="/members/archive/search" className="mt-8 flex gap-2">
        <input
          type="search"
          name="q"
          placeholder="Search the archive…"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        />
        <button
          type="submit"
          className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
        >
          Search
        </button>
      </form>

      <h2 className="mt-12 text-sm uppercase tracking-wide text-muted-foreground">
        Channels
      </h2>
      <ul className="mt-4 divide-y divide-border border-y border-border">
        {withMessages.map((channel) => (
          <li key={channel.id}>
            <Link
              href={`/members/archive/${channel.name}`}
              className="flex items-baseline justify-between gap-4 py-4 transition-colors hover:text-foreground"
            >
              <span className="min-w-0">
                <span className="font-medium">#{channel.name}</span>
                {channel.purpose && (
                  <span className="ml-3 truncate text-sm text-muted-foreground">
                    {channel.purpose}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-sm text-muted-foreground">
                {channel.message_count.toLocaleString()} messages ·{" "}
                {formatDate(channel.first_message_at)} – {formatDate(channel.last_message_at)}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {withMessages.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          Nothing archived yet. The nightly sync fills this in — or trigger one now at{" "}
          <code className="rounded bg-muted px-1 py-0.5">/api/archive/sync</code>.
        </p>
      )}
    </section>
  );
}
