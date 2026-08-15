// One-time setup + seed for the members Founder Pipeline table.
// Run: node --env-file=.env.local scripts/seed-bootstrappers.mjs
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

const rows = [
  ["Patrick Gryciuk", "Side Projects", "Canopy", "POC", "10-40", "Testing"],
  ["Sairam Suresh", "Side Projects", "PDF Redactor", "POC", "<10", "N/A"],
  ["Sankalp Shere", "Side Projects", "Personal Valet", "Development", "10-40", "Advice / Input"],
  ["Robert Hahn", "Side Projects", "Orren", "On Hold", "<10", "N/A"],
  ["Cristian", "Side Projects", "Flock Synthetics", "MVP", ">40", "Testing"],
  ["Parth Shah", "Founder", "Yoova", "MVP", ">40", "Testing"],
  ["Chris McFadden", "Founder", "Yoova", "MVP", ">40", "Testing"],
  ["Parna Khot", "Founder", "Kairos Spark", "Early Distribution", ">40", "Advice / Input"],
  ["Mark Petersen", "Founder", "KenMark", "Active Sales", ">40", "N/A"],
  ["James Hutchinson", "Founder", "Heavy Resume/Galaxy", "Development", "10-40", "TBD"],
  ["Rushabh Doshi", "Founder", "Beyond Five (Founder Distribution)", "TBD", ">40", "N/A"],
  ["Serrah Linares", "Founder", "Vieu", "Early Distribution", ">40", "N/A"],
  ["Daniel Hall", "Side Projects", "", "TBD", "10-40", "TBD"],
  ["Chance Kelch", "Founder", "Flock Synthetics", "MVP", ">40", "Testing"],
  ["Bobby Smith", "Founder-Curious", "Various", "Ideation", "10-40", "TBD"],
  ["Brian Sprague", "Founder-Curious", "Cheeky", "Development", "10-40", "Advice / Input"],
  ["Leo Novsky", "Founder-Curious", "Various", "Ideation", "<10", "N/A"],
  ["James Zhang", "Founder-Curious", "Inbound Voice Agent", "Ideation", "<10", "TBD"],
  ["Paul (Whale Rider)", "Side Projects", "", "TBD", "<10", "N/A"],
  ["Lek Dimarucot", "Founder-Curious", "StackSounder", "Development", ">40", "Testing"],
  ["Dave Anderson", "Side Projects", "HomingParrot", "MVP", "<10", "N/A"],
  ["Jaya Ramaprasad", "Founder", "Higher Octave", "Launched", "10-40", "Advice / Input"],
  ["John Jones", "Founder", "CrowdGuess", "Launched", "10-40", "Testing"],
  ["Seth King", "Side Projects", "OpenRover", "Development", "<10", "N/A"],
  ["Andrey Pogorelyy", "Side Projects", "LINC", "Development", "10-40", "Testing"],
];

await sql`
  CREATE TABLE IF NOT EXISTS bootstrappers (
    id SERIAL PRIMARY KEY,
    bootstrapper TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    product TEXT NOT NULL DEFAULT '',
    stage TEXT NOT NULL DEFAULT '',
    hrs_wk TEXT NOT NULL DEFAULT '',
    ask TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    updated_by TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

const [{ count }] = await sql`SELECT count(*)::int AS count FROM bootstrappers`;
if (count > 0) {
  console.log(`Table already has ${count} rows; skipping seed.`);
  process.exit(0);
}

for (const [bootstrapper, category, product, stage, hrs_wk, ask] of rows) {
  await sql`
    INSERT INTO bootstrappers (bootstrapper, category, product, stage, hrs_wk, ask)
    VALUES (${bootstrapper}, ${category}, ${product}, ${stage}, ${hrs_wk}, ${ask})
  `;
}
console.log(`Seeded ${rows.length} rows.`);
