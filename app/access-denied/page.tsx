import Link from "next/link";

export const metadata = { title: "Access denied | Barlow Labs" };

export default function AccessDeniedPage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Access denied</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        Sign-in didn&apos;t complete. This area is only available to members of
        the Barlow Labs Slack workspace.
      </p>
      <div className="mt-8">
        <Link
          href="/api/auth/slack/login"
          className="text-sm underline underline-offset-4 hover:text-foreground transition-colors"
        >
          Try signing in again
        </Link>
      </div>
    </section>
  );
}
