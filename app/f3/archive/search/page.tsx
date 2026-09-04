import SearchPage from "@/components/archive/SearchPage";
import { workspaceBySlug } from "@/lib/workspaces";

export const metadata = { title: "Search archive | F3 Cascades" };
export const dynamic = "force-dynamic";

const workspace = workspaceBySlug("f3")!;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return <SearchPage workspace={workspace} query={q ?? ""} />;
}
