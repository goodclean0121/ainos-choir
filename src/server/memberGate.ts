import { readAccess } from "./access";
import type { ChoirAccess } from "./songStore";

export const ACCESS_COOKIE = "ainos_access";
export const ACCESS_MAX_AGE = 60 * 60 * 24 * 365;

/** True when the cookie was signed for the passcode currently in force. */
export function accessGranted(cookie: string | undefined, access: ChoirAccess | null, secret: string): boolean {
  if (!access) return false;
  return readAccess(cookie, secret) === access.version;
}

/** A same-site path to return to after the passcode screen. */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}
