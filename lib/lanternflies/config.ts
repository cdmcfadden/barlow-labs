// Lanternflies: founders trade testing time across Slack workspaces.

export const LF = {
  /** Credits every new member starts with — enough to get one hour tested. */
  welcomeCredits: 3,
  minutesPerCredit: 20,
  /** Match DMs sent per release: a few per open slot, capped so nobody gets spammed. */
  offersPerSlot: 3,
  maxOffersPerFly: 12,
  platforms: ["iOS", "Android", "Web", "Desktop", "Other"] as const,
  botScopes: ["commands", "chat:write", "im:write", "users:read"],
};

/** A lanternfly is worth 1 credit per 20 minutes of estimated effort, rounded up. */
export function creditsForMinutes(minutes: number): number {
  return Math.max(1, Math.ceil(minutes / LF.minutesPerCredit));
}

export function siteUrl(path = ""): string {
  return `${process.env.LANTERNFLIES_SITE_URL ?? "https://www.barlow-labs.com"}${path}`;
}
