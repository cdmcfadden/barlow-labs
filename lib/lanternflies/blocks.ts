import { LF, siteUrl } from "./config";
import type { Assignment, Fly, Member } from "./store";

// Block Kit views and messages. Interactive action_ids carry the record id
// (`lf_take:42`) because Slack requires them to be unique within a view.

type Block = Record<string, unknown>;

export const esc = (s: string | null | undefined) =>
  (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const md = (text: string): Block => ({ type: "section", text: { type: "mrkdwn", text: clip(text, 2900) } });
const ctx = (text: string): Block => ({ type: "context", elements: [{ type: "mrkdwn", text: clip(text, 2900) }] });
const divider: Block = { type: "divider" };
const plain = (text: string, max = 75) => ({ type: "plain_text", text: clip(text, max), emoji: true });
const actions = (...elements: Block[]): Block => ({ type: "actions", elements });
const option = (text: string, value: string) => ({ text: plain(text), value });

function button(text: string, actionId: string, value: string, style?: "primary" | "danger"): Block {
  return { type: "button", text: plain(text), action_id: actionId, value, ...(style ? { style } : {}) };
}

function input(blockId: string, label: string, element: Block, optional = false, hint?: string): Block {
  return { type: "input", block_id: blockId, label: plain(label, 2000), element, optional, ...(hint ? { hint: plain(hint, 2000) } : {}) };
}

const quote = (text: string) => `>${esc(text).replace(/\n/g, "\n>")}`;
const credits = (n: number) => `${n} credit${n === 1 ? "" : "s"}`;

export function effortLabel(minutes: number): string {
  return minutes < 60 ? `${minutes} min` : `${Number((minutes / 60).toFixed(1))} hr`;
}

/** Only real http(s) URLs become links; anything else is shown as escaped text. */
export function safeLink(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\/[^\s<>|]+$/i.test(trimmed)) return `<${trimmed}|${esc(clip(trimmed.replace(/^https?:\/\//, ""), 60))}>`;
  return esc(trimmed);
}

export function flyText(fly: Fly): string {
  const open = Math.max(0, fly.slots - fly.taken);
  const where = fly.builder_team_name ? ` (${esc(fly.builder_team_name)})` : "";
  const platforms = fly.platforms.length ? ` · ${fly.platforms.join(", ")}` : "";
  return [
    `*${esc(fly.title)}*`,
    fly.description ? esc(clip(fly.description, 400)) : "",
    `_${effortLabel(fly.effort_minutes)} per tester · ${credits(fly.credits)} · ${open} of ${fly.slots} open${platforms} · by ${esc(fly.builder_name)}${where}_`,
  ]
    .filter(Boolean)
    .join("\n");
}

function confirmButtons(a: Assignment): Block {
  return actions(
    button("👍 Great — confirm", `lf_confirm5:${a.id}`, String(a.id), "primary"),
    button("👌 OK — confirm", `lf_confirm3:${a.id}`, String(a.id)),
    button("Not finished yet", `lf_reopen:${a.id}`, String(a.id))
  );
}

// ── App Home ────────────────────────────────────────────────────────────────

export type HomeData = {
  member: Member;
  balance: number;
  workspaceName: string;
  open: Fly[];
  myFlies: Fly[];
  reviews: Assignment[];
  tests: Assignment[];
};

export function homeView(d: HomeData): Block {
  const blocks: Block[] = [
    { type: "header", text: plain("🔦 Lanternflies") },
    md("*Trade testing time with other founders.* Test someone's product to earn credits, then spend them to get yours tested. 1 credit = 20 minutes."),
    ctx(
      `Balance: *${credits(d.balance)}* · ${esc(d.workspaceName)} · matching with ${
        d.member.circle === "community" ? "your community only" : "founders in every community"
      }${d.member.offers_paused ? " · match DMs paused" : ""}`
    ),
    actions(
      button("New test request", "lf_new", "new", "primary"),
      button("Edit profile", "lf_profile", "profile"),
      button("Refresh", "lf_refresh", "refresh")
    ),
  ];
  if (!d.member.product || d.member.can_test.length === 0) {
    blocks.push(md(":point_up: *Finish your profile* so we can match you — what you're building and which platforms you can test on."));
  }

  blocks.push(divider, md("*🧪 Tests you're doing*"));
  if (!d.tests.length) blocks.push(ctx("Nothing in progress. Take a request below to earn credits."));
  for (const t of d.tests.slice(0, 8)) {
    const waiting = t.status === "completed";
    blocks.push({
      ...md(
        `*${esc(t.title)}* for ${esc(t.builder_name)} · ${credits(t.credits)}\n${
          waiting ? "_Done — waiting for them to confirm_" : t.access_directions ? `How to get in: ${esc(clip(t.access_directions, 300))}` : ""
        }`
      ),
      ...(waiting ? {} : { accessory: button("Mark done", `lf_done:${t.id}`, String(t.id), "primary") }),
    });
  }

  blocks.push(divider, md("*📣 Your requests*"));
  if (!d.myFlies.length && !d.reviews.length) blocks.push(ctx("No open requests. Release one with *New test request*."));
  for (const r of d.reviews.slice(0, 6)) {
    if (r.status === "completed") {
      blocks.push(
        md(`*${esc(r.tester_name)}* finished *${esc(r.title)}*${r.notes ? `\n${quote(clip(r.notes, 500))}` : ""}${r.results_url ? `\nResults: ${safeLink(r.results_url)}` : ""}`),
        confirmButtons(r)
      );
    } else {
      blocks.push(ctx(`${esc(r.tester_name)} is testing *${esc(r.title)}* (${r.status.replace("_", " ")})`));
    }
  }
  for (const f of d.myFlies.slice(0, 6)) {
    blocks.push({ ...md(flyText(f)), accessory: button("Close", `lf_close:${f.id}`, String(f.id)) });
  }

  blocks.push(divider, md("*🔦 Requests you can take*"));
  if (!d.open.length) blocks.push(ctx("No open requests right now. We'll DM you when one matches your profile."));
  for (const f of d.open.slice(0, 8)) {
    blocks.push({ ...md(flyText(f)), accessory: button(`Take · +${f.credits}`, `lf_take:${f.id}`, String(f.id), "primary") });
  }

  blocks.push(divider, ctx(`Know founders who'd trade testing time? Send them to ${siteUrl("/lanternflies")}`));
  return { type: "home", blocks: blocks.slice(0, 100) };
}

// ── Modals ──────────────────────────────────────────────────────────────────

const circleOptions = [option("Founders in any community", "everyone"), option("Only my Slack community", "community")];
const platformOptions = () => LF.platforms.map((p) => option(p, p));

export function createFlyModal(): Block {
  const efforts = [10, 15, 20, 30, 45, 60, 90, 120];
  const slots = [1, 2, 3, 4, 5, 8, 10];
  return {
    type: "modal",
    callback_id: "lf_create",
    title: plain("New test request", 24),
    submit: plain("Release it 🔦", 24),
    close: plain("Cancel", 24),
    blocks: [
      input("title", "What should people test?", {
        type: "plain_text_input", action_id: "v", max_length: 100,
        placeholder: plain("e.g. Onboarding for our fitness app", 150),
      }),
      input("description", "Instructions", {
        type: "plain_text_input", action_id: "v", multiline: true, max_length: 2000,
        placeholder: plain("What should testers do? What are you trying to learn?", 150),
      }),
      input("access", "How to get in", {
        type: "plain_text_input", action_id: "v", multiline: true, max_length: 1000,
        placeholder: plain("URL, TestFlight link, test login…", 150),
      }, true, "Only shown to testers who take a slot."),
      input("platforms", "Platforms", { type: "checkboxes", action_id: "v", options: platformOptions() }, true),
      input("effort", "Time per tester", {
        type: "static_select", action_id: "v", initial_option: option("20 min", "20"),
        options: efforts.map((m) => option(effortLabel(m), String(m))),
      }),
      input("slots", "How many testers?", {
        type: "static_select", action_id: "v", initial_option: option("3", "3"),
        options: slots.map((n) => option(String(n), String(n))),
      }),
      input("circle", "Who can take it?", {
        type: "radio_buttons", action_id: "v", initial_option: circleOptions[0], options: circleOptions,
      }),
    ],
  };
}

export function profileModal(m: Member): Block {
  const canTest = platformOptions().filter((o) => m.can_test.includes(o.value));
  const pause = option("Pause new test offers", "paused");
  const initial = (value: string) => (value ? { initial_value: value } : {});
  return {
    type: "modal",
    callback_id: "lf_profile",
    title: plain("Your profile", 24),
    submit: plain("Save", 24),
    close: plain("Cancel", 24),
    blocks: [
      input("product", "What are you building?", { type: "plain_text_input", action_id: "v", max_length: 150, ...initial(m.product) }, true),
      input("product_url", "Product link", { type: "plain_text_input", action_id: "v", max_length: 300, ...initial(m.product_url) }, true),
      input("contact", "How can matches reach you?", {
        type: "plain_text_input", action_id: "v", max_length: 200,
        placeholder: plain("Email, Calendly, LinkedIn…", 150), ...initial(m.contact),
      }, true, "Only shared with founders you're matched with."),
      input("can_test", "Platforms you can test on", {
        type: "checkboxes", action_id: "v", options: platformOptions(), ...(canTest.length ? { initial_options: canTest } : {}),
      }, true),
      input("circle", "Match me with", {
        type: "radio_buttons", action_id: "v", options: circleOptions,
        initial_option: circleOptions[m.circle === "community" ? 1 : 0],
      }),
      input("paused", "Match DMs", {
        type: "checkboxes", action_id: "v", options: [pause], ...(m.offers_paused ? { initial_options: [pause] } : {}),
      }, true),
    ],
  };
}

export function completeModal(a: Assignment): Block {
  return {
    type: "modal",
    callback_id: "lf_complete",
    private_metadata: String(a.id),
    title: plain("Mark test done", 24),
    submit: plain("Send to builder", 24),
    close: plain("Cancel", 24),
    blocks: [
      md(`*${esc(a.title)}* for ${esc(a.builder_name)} · ${credits(a.credits)} once they confirm`),
      input("notes", "What did you find?", {
        type: "plain_text_input", action_id: "v", multiline: true, max_length: 3000,
        placeholder: plain("Bugs, confusing moments, what worked…", 150),
      }),
      input("results_url", "Link to recording or doc", {
        type: "plain_text_input", action_id: "v", max_length: 500,
        placeholder: plain("Loom, Google Doc, screenshots…", 150),
      }, true),
    ],
  };
}

// ── Messages ────────────────────────────────────────────────────────────────

type Message = { text: string; blocks: Block[] };

export function welcomeMessage(balance: number): Message {
  return {
    text: "Welcome to Lanternflies",
    blocks: [
      md(`🔦 *Welcome to Lanternflies!* Founders trade testing time here: test someone's product to earn credits, spend credits to get yours tested.\n\nYou start with *${credits(balance)}* — enough to get about ${balance * LF.minutesPerCredit} minutes of testing.`),
      md("*Next:* tell us what you're building and what you can test on, so we can send you good matches."),
      actions(button("Edit profile", "lf_profile", "profile", "primary"), button("New test request", "lf_new", "new")),
      ctx("Everything also lives in the *Home* tab of this app, and in `/lanternflies`."),
    ],
  };
}

export function commandHelp(balance: number): Message {
  return {
    text: `You have ${credits(balance)}.`,
    blocks: [
      md(`🔦 You have *${credits(balance)}*. Open the Lanternflies *Home* tab to see requests you can take.`),
      actions(button("New test request", "lf_new", "new", "primary"), button("Edit profile", "lf_profile", "profile")),
      ctx("`/lanternflies new` · `/lanternflies profile` · `/lanternflies balance`"),
    ],
  };
}

export function offerMessage(fly: Fly): Message {
  return {
    text: `A founder needs a tester: ${fly.title}`,
    blocks: [
      md(`🔦 *A founder needs a tester* — earn ${credits(fly.credits)}`),
      md(flyText(fly)),
      actions(
        button(`Take a slot · +${fly.credits}`, `lf_take:${fly.id}`, String(fly.id), "primary"),
        button("Pass", `lf_pass:${fly.id}`, String(fly.id))
      ),
    ],
  };
}

export function offerClosedMessage(fly: Fly, note: string): Message {
  return { text: note, blocks: [md(flyText(fly)), ctx(note)] };
}

export function testerIntro(a: Assignment, fly: Fly, builder: Member | null): Message {
  const sections = [
    `✅ *You're testing ${esc(fly.title)}* for ${esc(fly.builder_name)}${fly.builder_team_name ? ` (${esc(fly.builder_team_name)})` : ""} · ${credits(a.credits)} once they confirm.`,
    fly.description ? `*Instructions*\n${esc(fly.description)}` : "",
    `*How to get in*\n${fly.access_directions ? esc(fly.access_directions) : "_No access details yet — reach out to them below._"}`,
    builder?.contact ? `*Reach ${esc(builder.name)}:* ${esc(builder.contact)}` : "",
  ].filter(Boolean);
  return {
    text: `You're testing ${fly.title}`,
    blocks: [md(sections.join("\n\n")), actions(button("Mark done", `lf_done:${a.id}`, String(a.id), "primary"))],
  };
}

export function builderSlotTaken(a: Assignment, fly: Fly, tester: Member | null, testerTeamName: string): Message {
  const details = [
    tester?.product ? `They're building ${esc(tester.product)}${tester.product_url ? ` — ${safeLink(tester.product_url)}` : ""}.` : "",
    tester?.contact ? `Reach them: ${esc(tester.contact)}` : "",
  ].filter(Boolean);
  return {
    text: `${a.tester_name} took a slot on ${fly.title}`,
    blocks: [
      md(`🙌 *${esc(a.tester_name)}*${testerTeamName ? ` (${esc(testerTeamName)})` : ""} took a slot on *${esc(fly.title)}* — ${fly.taken} of ${fly.slots} filled.${details.length ? `\n${details.join("\n")}` : ""}`),
    ],
  };
}

export function builderReview(a: Assignment): Message {
  return {
    text: `${a.tester_name} finished testing ${a.title}`,
    blocks: [
      md(`🧪 *${esc(a.tester_name)}* finished testing *${esc(a.title)}*`),
      ...(a.notes ? [md(quote(clip(a.notes, 2500)))] : []),
      ...(a.results_url ? [md(`Results: ${safeLink(a.results_url)}`)] : []),
      ctx(`Confirming pays them ${credits(a.credits)} from your balance.`),
      confirmButtons(a),
    ],
  };
}

export function testerPaid(a: Assignment, balance: number, rating: number): Message {
  return {
    text: `You earned ${credits(a.credits)}`,
    blocks: [
      md(`${rating >= 5 ? "🌟" : "✅"} ${esc(a.builder_name)} confirmed your test of *${esc(a.title)}*${rating >= 5 ? " and loved it" : ""}. You earned *${credits(a.credits)}* — balance: *${credits(balance)}*.`),
      actions(button("Spend them: new test request", "lf_new", "new", "primary")),
    ],
  };
}

export function testerReopened(a: Assignment): Message {
  return {
    text: `${a.builder_name} says ${a.title} isn't finished yet`,
    blocks: [
      md(`↩️ ${esc(a.builder_name)} says your test of *${esc(a.title)}* isn't finished yet. Reach out if anything's unclear, then mark it done again.`),
      actions(button("Mark done", `lf_done:${a.id}`, String(a.id), "primary")),
    ],
  };
}
