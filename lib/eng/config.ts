// What the engineering page needs to know that neither Jira nor GitHub says.

/**
 * One row per person. Jira knows people by display name and GitHub by login
 * (or, for commits made outside GitHub, the git author name), and nothing
 * links the two — so this list does. Anyone missing from it still shows up,
 * under whatever name the source gave them.
 */
export const PEOPLE: { name: string; jira: string[]; github: string[] }[] = [
  { name: "Chris McFadden", jira: ["Chris McFadden"], github: ["cdmcfadden"] },
  { name: "Parth Shah", jira: ["Parth Shah"], github: [] },
  { name: "Dinesh Vaghasia", jira: ["Dinesh Vaghasia"], github: [] },
  { name: "Monil", jira: ["Monil"], github: ["moniljainn18", "Monil"] },
  { name: "Vishal Gajera", jira: ["vishal.gajera"], github: ["vishal-softyoi"] },
  { name: "Pankaj Bhalala", jira: ["Pankaj Bhalala"], github: ["pankajsoftyoi"] },
  { name: "Shubham", jira: [], github: ["shubham-1211"] },
];

/**
 * The board, in the order work moves through it. A move to an earlier status
 * than the one it left is a step backwards; a step backwards out of review or
 * later is a bounce. Statuses not listed are placed by their Jira category.
 */
export const WORKFLOW = [
  "Requested",
  "Ready For Development",
  "In Development",
  "In Review",
  "Ready for Deployed",
  "Live",
];

/** Rank at which work is in QA. Leaving here (or later) for below it is a bounce. */
export const REVIEW_RANK = WORKFLOW.indexOf("In Review");

/**
 * How long a high-priority ticket may sit in one status before it is called
 * stuck. Days, measured from the last time its status changed.
 */
export const STALE_AFTER_DAYS: Record<string, number> = {
  Highest: 3,
  High: 7,
};

export const WINDOWS = [7, 30, 90] as const;
export const DEFAULT_WINDOW = 30;

/** The widest window; everything is fetched once for this and sliced after. */
export const FETCH_DAYS = Math.max(...WINDOWS);

/**
 * Authors that are tools, not people. Lovable commits both as its GitHub app
 * and, when it pushes without one, under the plain git name "Lovable".
 */
const BOT_NAMES = new Set(["lovable", "invalid-email-address"]);

export function isBot(login: string): boolean {
  return /\[bot\]$/i.test(login) || /-bot$/i.test(login) || BOT_NAMES.has(login.toLowerCase());
}
