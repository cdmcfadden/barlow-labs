import Link from "next/link";
import { renderMrkdwn, searchMessages, userNameMap } from "@/lib/archive";

export const metadata = { title: "Search archive | Barlow Labs" };
export const dynamic = "force-dynamic";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const [hits, names] = query
    ? await Promise.all([searchMessages(query), userNameMap()])
    : [[], new Map<string, string>()];

  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-sm text-muted-foreground">
        <Link href="/members/archive" className="underline underline-offset-4">
          Slack archive
        </Link>{" "}
        / Search
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Search the archive</h1>

      <form action="/members/archive/search" className="mt-8 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          autoFocus
          placeholder="pose estimation, rover, MOU…"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        />
        <button
          type="submit"
          className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
        >
          Search
        </button>
      </form>

      {query && (
        <p className="mt-6 text-sm text-muted-foreground">
          {hits.length === 0
            ? "No matches."
            : `${hits.length}${hits.length === 100 ? "+" : ""} matches for "${query}"`}
        </p>
      )}

      <ul className="mt-6 space-y-5">
        {hits.map((hit) => (
          <li key={`${hit.channel_id}-${hit.ts}`} className="rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
              <Link
                href={`/members/archive/${hit.channel_name}/${hit.month}#${hit.ts}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                #{hit.channel_name}
              </Link>
              <span className="text-muted-foreground">{hit.user_name}</span>
              <span className="text-xs text-muted-foreground">{formatWhen(hit.posted_at)}</span>
            </div>
            <div
              className="mt-1.5 text-sm leading-relaxed text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: renderMrkdwn(hit.text, names) }}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
