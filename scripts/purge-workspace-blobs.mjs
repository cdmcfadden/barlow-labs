// Deletes mirrored attachments for one workspace and marks them unstored.
// Used when a workspace switches to a text-only policy.
//
//   DATABASE_URL=... BLOB_READ_WRITE_TOKEN=... \
//     node scripts/purge-workspace-blobs.mjs <team_id> [--dry-run]
import { neon } from "@neondatabase/serverless";
import { del } from "@vercel/blob";

const teamId = process.argv[2];
const dryRun = process.argv.includes("--dry-run");
if (!teamId) {
  console.error("usage: node scripts/purge-workspace-blobs.mjs <team_id> [--dry-run]");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

const files = await sql`
  SELECT f.id, f.name, f.size, f.blob_pathname
  FROM archive_files f
  JOIN archive_channels c ON c.id = f.channel_id
  WHERE c.team_id = ${teamId} AND f.mirrored AND f.blob_pathname <> ''
`;

const bytes = files.reduce((sum, file) => sum + Number(file.size), 0);
console.log(`${files.length} files, ${(bytes / 1024 / 1024).toFixed(0)} MB`);
if (dryRun) {
  console.log("dry run — nothing deleted");
  process.exit(0);
}

let deleted = 0;
for (const file of files) {
  try {
    await del(file.blob_pathname);
  } catch (error) {
    // A blob that is already gone still needs its row corrected.
    console.warn(`del ${file.name}: ${error}`);
  }
  await sql`
    UPDATE archive_files SET mirrored = false, blob_url = '', blob_pathname = ''
    WHERE id = ${file.id}
  `;
  deleted += 1;
  if (deleted % 25 === 0) console.log(`  ${deleted}/${files.length}`);
}
console.log(`deleted ${deleted} blobs, freed ~${(bytes / 1024 / 1024).toFixed(0)} MB`);
