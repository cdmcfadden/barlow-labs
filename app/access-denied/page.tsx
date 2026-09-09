import Link from "next/link";
import { workspaceBySlug, WORKSPACES } from "@/lib/workspaces";

export const metadata = { title: "Access denied | Barlow Labs" };

export default async function AccessDeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; workspace?: string; next?: string }>;
}) {
  const { reason, workspace: slug, next } = await searchParams;
  const workspace = workspaceBySlug(slug ?? "") ?? WORKSPACES[0];

  const retry = new URLSearchParams({ workspace: workspace.slug });
  if (next?.startsWith("/") && !next.startsWith("//")) retry.set("next", next);

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Access denied</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        {reason === "wrong_workspace"
          ? `That Slack account isn't in the ${workspace.label} workspace. This area is only open to its members.`
          : `Sign-in didn't complete. This area is only available to members of the ${workspace.label} Slack workspace.`}
      </p>
      <div className="mt-8">
        <Link
          href={`/api/auth/slack/login?${retry}`}
          className="text-sm underline underline-offset-4 transition-colors hover:text-foreground"
        >
          Sign in to {workspace.label}
        </Link>
      </div>
    </section>
  );
}
