import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Bot tokens for every installed workspace live in the database, so they are
// sealed with AES-256-GCM. A leaked database dump alone can't post as the app.

function key(): Buffer {
  const hex = process.env.LANTERNFLIES_TOKEN_KEY ?? "";
  if (!/^[0-9a-f]{64}$/i.test(hex)) {
    throw new Error("LANTERNFLIES_TOKEN_KEY must be 64 hex characters (openssl rand -hex 32)");
  }
  return Buffer.from(hex, "hex");
}

export function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const sealed = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), sealed].map((b) => b.toString("base64url")).join(".");
}

export function decryptToken(token: string): string {
  const [iv, tag, sealed] = token.split(".").map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(sealed), decipher.final()]).toString("utf8");
}
