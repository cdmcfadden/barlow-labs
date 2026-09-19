import Anthropic from "@anthropic-ai/sdk";
import { botToken, type Agent } from "./config";
import { SLACK_TOOLS, SlackReader, ToolError, runSlackTool } from "./tools";

const MODEL = "claude-opus-5";
const MAX_ROUNDS = 10;

const SECRET_PATTERNS = [
  /sk-ant-[A-Za-z0-9_-]{10,}/g,
  /xox[abprs]-[A-Za-z0-9-]{10,}/g,
  /xapp-[A-Za-z0-9-]{10,}/g,
  /gh[pousr]_[A-Za-z0-9]{20,}/g,
  /github_pat_[A-Za-z0-9_]{20,}/g,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
];

export const redact = (text: string) => SECRET_PATTERNS.reduce((t, p) => t.replace(p, "[redacted]"), text);

/**
 * Answers one question with the agent's read-only Slack tools (plus web search
 * and fetch for agents that have them). `context` is the conversation the
 * question was asked in, which the asker can already see.
 */
export async function ask(agent: Agent, asker: string, question: string, context?: string): Promise<string> {
  const reader = new SlackReader(botToken(agent));
  const client = new Anthropic();
  const today = new Date().toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "full" });

  const tools: Anthropic.Beta.BetaToolUnion[] = [...SLACK_TOOLS];
  if (agent.web) {
    tools.push(
      { type: "web_search_20260209", name: "web_search", max_uses: 5 },
      { type: "web_fetch_20260209", name: "web_fetch", max_uses: 5 }
    );
  }

  const prompt = [
    context ? `The conversation so far:\n${context}\n` : "",
    `Today is ${today}.`,
    `${asker} asks: ${question}`,
  ].join("\n");
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: prompt }];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      // On a policy decline, re-run on a fallback model instead of stopping.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: agent.system,
      tools,
      messages,
    });

    if (response.stop_reason === "refusal") return "Sorry, I can't help with that one.";

    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }

    const calls = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (response.stop_reason !== "tool_use" || calls.length === 0) {
      const text = response.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();
      return redact(text || "I couldn't come up with an answer to that.");
    }

    messages.push({ role: "assistant", content: response.content });
    const results = await Promise.all(
      calls.map(async (call): Promise<Anthropic.Beta.BetaToolResultBlockParam> => {
        try {
          const output = await runSlackTool(reader, call.name, call.input as Record<string, unknown>);
          return { type: "tool_result", tool_use_id: call.id, content: redact(output) };
        } catch (error) {
          const message = error instanceof ToolError ? error.message : `Slack error: ${(error as Error).message}`;
          return { type: "tool_result", tool_use_id: call.id, content: message, is_error: true };
        }
      })
    );
    messages.push({ role: "user", content: results });
  }
  return "That took more digging than I'm allowed. Try a narrower question.";
}
