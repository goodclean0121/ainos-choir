import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 32;

const normalize = (code: string) => code.trim().normalize("NFC");

/** "salt:hash" in hex; the passcode itself is never stored. */
export function hashPasscode(code: string): string {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(normalize(code), salt, KEY_LENGTH).toString("hex")}`;
}

export function verifyPasscode(code: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex || hashHex.length !== KEY_LENGTH * 2) return false;
  const actual = scryptSync(normalize(code), Buffer.from(saltHex, "hex"), KEY_LENGTH);
  return timingSafeEqual(actual, Buffer.from(hashHex, "hex"));
}

const sign = (version: number, secret: string) =>
  createHmac("sha256", secret).update(`access:${version}`).digest("base64url");

/** Cookie value proving the device entered the passcode of this version. */
export function signAccess(version: number, secret: string): string {
  return `${version}.${sign(version, secret)}`;
}

/** The passcode version the cookie was signed for, or null when it is missing or forged. */
export function readAccess(cookie: string | undefined, secret: string): number | null {
  const match = cookie?.match(/^(\d+)\.([\w-]+)$/);
  if (!match) return null;
  const version = Number(match[1]);
  const expected = Buffer.from(sign(version, secret));
  const given = Buffer.from(match[2]);
  return expected.length === given.length && timingSafeEqual(expected, given) ? version : null;
}

export function createRateLimiter({ limit, windowMs, now = Date.now }: { limit: number; windowMs: number; now?: () => number }) {
  const hits = new Map<string, number[]>();
  return {
    /** Records a try; false once the key has used up its tries in this window. */
    hit(key: string): boolean {
      const t = now();
      const recent = (hits.get(key) ?? []).filter((at) => t - at < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return false;
      }
      recent.push(t);
      hits.set(key, recent);
      return true;
    },
  };
}
