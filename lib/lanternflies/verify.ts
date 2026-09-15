import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies Slack's request signature (v0 HMAC of `v0:timestamp:body`).
 * Every Slack-facing route must call this on the raw body before parsing it.
 */
export function verifySlackRequest(
  rawBody: string,
  timestamp: string | null,
  signature: string | null,
  secret = process.env.LANTERNFLIES_SLACK_SIGNING_SECRET
): boolean {
  if (!secret || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  // Reject replays older than five minutes.
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;
  const expected = `v0=${createHmac("sha256", secret).update(`v0:${timestamp}:${rawBody}`).digest("hex")}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
