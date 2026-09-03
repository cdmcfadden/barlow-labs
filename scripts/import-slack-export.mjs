// One-time backfill from a Slack workspace export.
//
// The API will not hand back messages older than ~90 days on a free plan, so
// this is the only way to recover history that is already hidden. A workspace
// owner exports from Slack (Settings -> Import/Export Data -> Export), unzips
// the archive, and points this script at the folder:
//
//   DATABASE_URL=... node scripts/import-slack-export.mjs ~/Downloads/slack-export
//
// Attachments are not mirrored here — the export only carries Slack file URLs,
// which expire. Run the sync route afterwards to mirror anything still live.

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

const root = process.argv[2];
if (!root) {
  console.error("usage: node scripts/import-slack-export.mjs <unzipped-export-dir>");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return null;
  }
}

const users = (await readJson(path.join(root, "users.json"))) ?? [];
const names = new Map();
for (const user of users) {
  const display = user.profile?.real_name || user.real_name || user.name || user.id;
  names.set(user.id, display);
  await sql`
    INSERT INTO archive_users (id, name, real_name, avatar, is_bot, deleted, updated_at)
    VALUES (${user.id}, ${user.name ?? ""}, ${display}, ${user.profile?.image_72 ?? ""},
            ${Boolean(user.is_bot)}, ${Boolean(user.deleted)}, now())
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, real_name = EXCLUDED.real_name, updated_at = now()
  `;
}
console.log(`users: ${users.length}`);

const channels = (await readJson(path.join(root, "channels.json"))) ?? [];
let imported = 0;

for (const channel of channels) {
  const dir = path.join(root, channel.name);
  try {
    if (!(await stat(dir)).isDirectory()) continue;
  } catch {
    continue; // Exported metadata without a message folder.
  }

  await sql`
    INSERT INTO archive_channels (id, name, purpose, topic, is_private, is_archived,
                                  synced_through_ts, updated_at)
    VALUES (${channel.id}, ${channel.name}, ${channel.purpose?.value ?? ""},
            ${channel.topic?.value ?? ""}, false, ${Boolean(channel.is_archived)}, '0', now())
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, purpose = EXCLUDED.purpose, updated_at = now()
  `;

  for (const day of (await readdir(dir)).filter((f) => f.endsWith(".json")).sort()) {
    for (const message of (await readJson(path.join(dir, day))) ?? []) {
      if (!message.ts) continue;
      const author =
        names.get(message.user) ?? message.user_profile?.real_name ?? message.username ?? message.user ?? "";
      const postedAt = new Date(Number(message.ts.split(".")[0]) * 1000).toISOString();

      // Existing rows came from the live API and are at least as complete —
      // an import only fills gaps.
      await sql`
        INSERT INTO archive_messages (channel_id, ts, thread_ts, user_id, user_name, subtype,
                                      text, reactions, reply_count, posted_at, edited_at, raw)
        VALUES (${channel.id}, ${message.ts}, ${message.thread_ts ?? null},
                ${message.user ?? message.bot_id ?? ""}, ${author}, ${message.subtype ?? ""},
                ${message.text ?? ""}, ${JSON.stringify(message.reactions ?? [])}::jsonb,
                ${message.reply_count ?? 0}, ${postedAt},
                ${message.edited ? new Date(Number(message.edited.ts.split(".")[0]) * 1000).toISOString() : null},
                ${JSON.stringify(message)}::jsonb)
        ON CONFLICT (channel_id, ts) DO NOTHING
      `;

      for (const file of message.files ?? []) {
        if (!file.id) continue;
        await sql`
          INSERT INTO archive_files (id, channel_id, message_ts, name, mimetype, size,
                                     blob_url, slack_permalink, mirrored)
          VALUES (${file.id}, ${channel.id}, ${message.ts}, ${file.name ?? ""},
                  ${file.mimetype ?? ""}, ${file.size ?? 0}, '', ${file.permalink ?? ""}, false)
          ON CONFLICT (id) DO NOTHING
        `;
      }
      imported += 1;
    }
  }

  const count = await sql`
    SELECT COUNT(*)::int AS n FROM archive_messages WHERE channel_id = ${channel.id}
  `;
  await sql`
    UPDATE archive_channels SET message_count = ${count[0].n}, updated_at = now()
    WHERE id = ${channel.id}
  `;
  console.log(`#${channel.name}: ${count[0].n} messages archived`);
}

console.log(`done — ${imported} messages read from the export`);
