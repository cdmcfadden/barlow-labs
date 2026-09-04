/**
 * The Slack workspaces this site archives.
 *
 * Each one is a separate Slack app with its own bot token and its own
 * "Sign in with Slack" credentials, so a member of one workspace can never
 * read the other's archive: the OAuth app that signs them in is installed in
 * exactly one workspace, and `teamId` is checked again on every request.
 */

export type Workspace = {
  slug: string;
  label: string;
  teamId: string;
  /** Env var holding the bot token used to read history. */
  botTokenEnv: string;
  /** Env vars for the Sign in with Slack app installed in this workspace. */
  clientIdEnv: string;
  clientSecretEnv: string;
  /** Where this workspace's archive lives. */
  basePath: string;
  /**
   * Whether attachments are copied into Blob storage. Off for workspaces whose
   * media would exhaust the store — their files stay recorded (name, size,
   * poster, Slack link) but the bytes are not kept.
   */
  mirrorFiles: boolean;
  blurb: string;
};

export const WORKSPACES: Workspace[] = [
  {
    slug: "barlow",
    label: "Barlow Labs",
    teamId: process.env.SLACK_TEAM_ID || "T08UF8ML4P9",
    botTokenEnv: "SLACK_BOT_TOKEN",
    clientIdEnv: "SLACK_CLIENT_ID",
    clientSecretEnv: "SLACK_CLIENT_SECRET",
    basePath: "/members/archive",
    mirrorFiles: true,
    blurb:
      "Our Slack plan drops message history after 90 days. Everything here was mirrored before that happened, so it stays readable and searchable for good.",
  },
  {
    slug: "f3",
    label: "F3 Cascades",
    teamId: process.env.F3_SLACK_TEAM_ID || "T0A18QCK9DM",
    botTokenEnv: "F3_SLACK_BOT_TOKEN",
    clientIdEnv: "F3_SLACK_CLIENT_ID",
    clientSecretEnv: "F3_SLACK_CLIENT_SECRET",
    basePath: "/f3/archive",
    // F3's workout photos and videos alone exceeded the whole Blob quota.
    mirrorFiles: false,
    blurb:
      "Slack hides F3 Cascades history after 90 days. Backblasts, AO announcements and event threads are mirrored here before that happens, so the PAX keep the record.",
  },
];

export function workspaceBySlug(slug: string): Workspace | null {
  return WORKSPACES.find((workspace) => workspace.slug === slug) ?? null;
}

export function workspaceByTeam(teamId: string | undefined): Workspace | null {
  if (!teamId) return null;
  return WORKSPACES.find((workspace) => workspace.teamId === teamId) ?? null;
}

/** The workspace whose archive lives under this path, if any. */
export function workspaceForPath(pathname: string): Workspace | null {
  return (
    WORKSPACES.find(
      (workspace) =>
        pathname === workspace.basePath || pathname.startsWith(`${workspace.basePath}/`)
    ) ?? null
  );
}

export function botToken(workspace: Workspace): string {
  const token = process.env[workspace.botTokenEnv];
  if (!token) throw new Error(`${workspace.botTokenEnv} is not set`);
  return token;
}

/** Workspaces we hold a bot token for — the ones the sync can actually read. */
export function syncableWorkspaces(): Workspace[] {
  return WORKSPACES.filter((workspace) => Boolean(process.env[workspace.botTokenEnv]));
}
