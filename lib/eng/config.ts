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
  { name: "Shubham Rajput", jira: ["Shubham Rajput"], github: ["shubham-1211"] },
];

/**
 * The board, in the order work moves through it. Statuses not listed are
 * placed by their Jira category.
 */
export const WORKFLOW = [
  "Requested",
  "Ready For Development",
  "In Development",
  "UAT",
  "In Review",
  "Ready for Deployed",
  "Live",
];

/**
 * Where QA starts. The developer hands over by moving a ticket here (or past
 * it); a move from here or later back below it is a bounce.
 */
export const QA_STATUS = "UAT";
export const REVIEW_RANK = WORKFLOW.indexOf(QA_STATUS);

/**
 * Shipped means Live, not Jira's "done" category — Ready for Deployed is in
 * that category too, and a ticket waiting on a deploy has not reached anyone.
 */
export const SHIPPED_STATUS = "Live";
export const SHIPPED_RANK = WORKFLOW.indexOf(SHIPPED_STATUS);

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
