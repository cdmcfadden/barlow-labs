import { slackGet, slackPost } from "@/lib/slack";
import { respond, slackName } from "@/lib/lanternflies/slackApi";
import { botToken, type Agent } from "./config";
import { isQDroughtQuestion, qDroughtReport } from "./qDrought";
import { ask } from "./run";
import { SlackReader } from "./tools";

const SLACK_CHUNK = 3500;
const CONTEXT_MESSAGES = 30;

export type IncomingMessage = {
  user: string;
  text: string;
  channel: string;
  ts: string;
  thread_ts?: string;
  channel_type?: string;
};

/** Best-effort Markdown -> Slack mrkdwn for anything the model slips in. */
function toSlack(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "*$1*")
    .replace(/^#{1,6}\s+(.+)$/gm, "*$1*")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "<$2|$1>");
}

function chunks(text: string): string[] {
  const parts: string[] = [];
  let current = "";
  for (let para of text.split("\n\n")) {
    while (para.length > SLACK_CHUNK) {
      parts.push(para.slice(0, SLACK_CHUNK));
      para = para.slice(SLACK_CHUNK);
    }
    if (current && current.length + para.length + 2 > SLACK_CHUNK) {
      parts.push(current);
      current = para;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }
  if (current) parts.push(current);
  return parts;
}

async function reply(token: string, channel: string, threadTs: string, text: string) {
  for (const part of chunks(toSlack(text))) {
    await slackPost("chat.postMessage", { channel, thread_ts: threadTs, text: part, unfurl_links: false }, { token });
  }
}

/** An @mention in a channel, or any message in a DM with the bot. Replies in the thread. */
export async function answerMessage(agent: Agent, msg: IncomingMessage) {
  const token = botToken(agent);
  const threadTs = msg.thread_ts ?? msg.ts;
  const question = msg.text.replace(new RegExp(`<@${agent.botUserId}(\\|[^>]*)?>`, "g"), "").trim() || "Hello! How can you help?";
  const reader = new SlackReader(token);
  const asker = (await slackName(token, msg.user)) || "Someone";
  console.log(`[agents:${agent.key}] ${asker} in ${msg.channel}: ${question.slice(0, 80)}`);

  const alertUser = agent.alertUserEnv ? process.env[agent.alertUserEnv] : undefined;
  if (alertUser && alertUser !== msg.user) {
    const link = await slackGet<{ permalink: string }>("chat.getPermalink", { channel: msg.channel, message_ts: msg.ts }, { token })
      .then((r) => r.permalink)
      .catch(() => "");
    // Posting to a user ID lands in the app's DM with them, without needing im:write.
    const text = `${agent.label} agent was mentioned by ${asker}: ${link || msg.channel}`;
    await slackPost("chat.postMessage", { channel: alertUser, text }, { token }).catch((error) =>
      console.error(`[agents:${agent.key}] alert DM failed`, error)
    );
  }

  try {
    if (agent.key === "f3" && isQDroughtQuestion(question)) {
      await reply(token, msg.channel, threadTs, "⏳ Crunching the numbers across all AO backblasts... results in this thread in about a minute.");
      await reply(token, msg.channel, threadTs, await qDroughtReport(token));
      return;
    }

    // The thread (or recent DM history) the question was asked in, which the asker can already see.
    let context: string | undefined;
    if (msg.thread_ts) {
      const thread = await reader.thread(msg.channel, msg.thread_ts);
      context = await reader.render(thread.filter((m) => m.ts !== msg.ts).slice(-CONTEXT_MESSAGES));
    }

    await reply(token, msg.channel, threadTs, await ask(agent, asker, question, context));
  } catch (error) {
    console.error(`[agents:${agent.key}] failed`, error);
    await reply(token, msg.channel, threadTs, "⚠️ I hit an error answering that. Please try again.").catch(() => {});
  }
}

export type SlashCommand = { user_id: string; text: string; response_url: string; channel_id: string };

/** `/theo question`: one visible reply in the conversation the command was typed in. */
export async function answerCommand(agent: Agent, command: SlashCommand) {
  const token = botToken(agent);
  const question = command.text.trim();
  const asker = (await slackName(token, command.user_id)) || "Someone";
  console.log(`[agents:${agent.key}] /command from ${asker} in ${command.channel_id}: ${question.slice(0, 80)}`);
  try {
    const answer = toSlack(await ask(agent, asker, question));
    const quoted = question.split("\n").map((line) => `> ${line}`).join("\n");
    await respond(command.response_url, { response_type: "in_channel", text: `*${asker} asked:*\n${quoted}\n\n${answer}` });
  } catch (error) {
    console.error(`[agents:${agent.key}] command failed`, error);
    await respond(command.response_url, { response_type: "ephemeral", text: "⚠️ Theo couldn't answer that one. Please try again." });
  }
}
