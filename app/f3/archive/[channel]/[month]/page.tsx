import MonthPage from "@/components/archive/MonthPage";
import { workspaceBySlug } from "@/lib/workspaces";

export const dynamic = "force-dynamic";

const workspace = workspaceBySlug("f3")!;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ channel: string; month: string }>;
}) {
  const { channel, month } = await params;
  return { title: `#${channel} ${month} | F3 Cascades` };
}

export default async function Page({
  params,
}: {
  params: Promise<{ channel: string; month: string }>;
}) {
  const { channel, month } = await params;
  return <MonthPage workspace={workspace} channelName={channel} month={month} />;
}
