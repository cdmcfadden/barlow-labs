import { slackGet, slackPost } from "@/lib/slack";

// Thin wrappers over the Web API calls the app makes. Every call takes the
// token of the workspace it acts in — members of different workspaces are
// always reached through their own workspace's installation.

export async function dm(token: string, userId: string, text: string, blocks?: unknown[]) {
  const opened = await slackPost<{ channel: { id: string } }>(
    "conversations.open",
    { users: userId },
    { token }
  );
  const posted = await slackPost<{ channel: string; ts: string }>(
    "chat.postMessage",
    { channel: opened.channel.id, text, blocks, unfurl_links: false },
    { token }
  );
  return { channel: posted.channel, ts: posted.ts };
}

export function updateMessage(
  token: string,
  channel: string,
  ts: string,
  text: string,
  blocks?: unknown[]
) {
  return slackPost("chat.update", { channel, ts, text, blocks }, { token });
}

export function openView(token: string, triggerId: string, view: unknown) {
  return slackPost("views.open", { trigger_id: triggerId, view }, { token });
}

export function publishHome(token: string, userId: string, view: unknown) {
  return slackPost("views.publish", { user_id: userId, view }, { token });
}

/** Replies through an interaction's response_url (no token needed). */
export async function respond(responseUrl: string | undefined, body: Record<string, unknown>) {
  if (!responseUrl) return;
  await fetch(responseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function slackName(token: string, userId: string): Promise<string> {
  try {
    const { user } = await slackGet<{
      user: { name?: string; real_name?: string; profile?: { display_name?: string; real_name?: string } };
    }>("users.info", { user: userId }, { token });
    return user.profile?.display_name || user.profile?.real_name || user.real_name || user.name || "";
  } catch {
    return "";
  }
}
