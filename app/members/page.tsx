import { cookies } from "next/headers";
import { SESSION_COOKIE, openSession } from "@/lib/session";
import BootstrapperTable from "./BootstrapperTable";
import LanternflySection from "./LanternflySection";
import DocumentsArea from "./DocumentsArea";

export const metadata = { title: "Members | Barlow Labs" };

export default async function MembersPage() {
  const cookieStore = await cookies();
  const session = await openSession(cookieStore.get(SESSION_COOKIE)?.value);

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <p className="text-sm text-muted-foreground">Barlow Labs team</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Welcome{session?.name ? `, ${session.name}` : ""}
      </h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        This area is only visible to members of the Barlow Labs Slack workspace.
      </p>
      <DocumentsArea />
      <BootstrapperTable />
      {session && <LanternflySection me={{ sub: session.sub, name: session.name }} />}
      <div className="mt-8">
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </section>
  );
}
