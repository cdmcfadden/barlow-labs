import ArchiveIndex from "@/components/archive/ArchiveIndex";
import { workspaceBySlug } from "@/lib/workspaces";

export const metadata = { title: "Slack archive | F3 Cascades" };
export const dynamic = "force-dynamic";

const workspace = workspaceBySlug("f3")!;

export default function Page() {
  return <ArchiveIndex workspace={workspace} />;
}
