import ChannelPage from "@/components/archive/ChannelPage";
import { workspaceBySlug } from "@/lib/workspaces";

export const dynamic = "force-dynamic";

const workspace = workspaceBySlug("f3")!;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ channel: string }>;
}) {
  const { channel } = await params;
  return { title: `#${channel} archive | F3 Cascades` };
}

export default async function Page({ params }: { params: Promise<{ channel: string }> }) {
  const { channel } = await params;
  return <ChannelPage workspace={workspace} channelName={channel} />;
}
