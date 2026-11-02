import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE, accessGranted } from "./memberGate";
import { getServerStore, isTestMode } from "./store";

export function cookieSecret(): string {
  if (isTestMode()) return "test-mode-cookie-secret-not-for-production";
  const secret = process.env.ACCESS_COOKIE_SECRET;
  if (!secret || secret.length < 32) throw new Error("ACCESS_COOKIE_SECRET(32자 이상) 환경 변수가 필요해요.");
  return secret;
}

/** Sends devices without the current passcode to the passcode screen. */
export async function requireMember(next: string) {
  const [jar, access] = await Promise.all([cookies(), getServerStore().getAccess()]);
  if (!accessGranted(jar.get(ACCESS_COOKIE)?.value, access, cookieSecret())) {
    redirect(`/unlock?next=${encodeURIComponent(next)}`);
  }
}
