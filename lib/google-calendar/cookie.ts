/**
 * 將 Google OAuth token 加密後存於 cookie，僅在 API route 使用。
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const COOKIE_NAME = "google_calendar_token";

function getKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

export interface TokenPayload {
  access_token: string;
  refresh_token?: string;
  expiry_date: number;
}

export function encryptToken(secret: string, payload: TokenPayload): string {
  const key = getKey(secret);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const json = JSON.stringify(payload);
  const enc = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

export function decryptToken(secret: string, raw: string): TokenPayload | null {
  try {
    const key = getKey(secret);
    const buf = Buffer.from(raw, "base64url");
    if (buf.length < IV_LEN + TAG_LEN) return null;
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const enc = buf.subarray(IV_LEN + TAG_LEN);
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const json = decipher.update(enc) + decipher.final("utf8");
    return JSON.parse(json) as TokenPayload;
  } catch {
    return null;
  }
}

export function getTokenCookieName(): string {
  return COOKIE_NAME;
}

/** 支援 NextResponse（headers.set）與自建 res（setHeader） */
type CookieRes =
  | { headers: { set(name: string, value: string): void } }
  | { setHeader(name: string, value: string): void };

function setCookie(res: CookieRes, value: string): void {
  if ("headers" in res && typeof res.headers?.set === "function") {
    res.headers.set("Set-Cookie", value);
  } else if ("setHeader" in res) {
    res.setHeader("Set-Cookie", value);
  }
}

export function setTokenCookie(secret: string, payload: TokenPayload, res: CookieRes): void {
  const value = encryptToken(secret, payload);
  const isProd = process.env.NODE_ENV === "production";
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  const secure = isProd ? "; Secure" : "";
  setCookie(
    res,
    `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
  );
}

export function clearTokenCookie(res: CookieRes): void {
  setCookie(res, `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}
