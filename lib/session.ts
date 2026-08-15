// Signed session cookie helpers. Uses Web Crypto (HMAC-SHA256) so the same
// code runs in both route handlers and middleware.

export const SESSION_COOKIE = "bl_session";

export type Session = {
  sub: string; // Slack user ID
  name: string;
  email: string;
  exp: number; // unix seconds
};

function secretKey(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array<ArrayBuffer> {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = atob(padded);
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
  return bytes;
}

export async function sealSession(session: Session): Promise<string> {
  const payload = b64url(new TextEncoder().encode(JSON.stringify(session)));
  const sig = await crypto.subtle.sign(
    "HMAC",
    await secretKey(),
    new TextEncoder().encode(payload)
  );
  return `${payload}.${b64url(new Uint8Array(sig))}`;
}

export async function openSession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await secretKey(),
      b64urlDecode(sig),
      new TextEncoder().encode(payload)
    );
    if (!valid) return null;
    const session = JSON.parse(
      new TextDecoder().decode(b64urlDecode(payload))
    ) as Session;
    if (session.exp * 1000 < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}
