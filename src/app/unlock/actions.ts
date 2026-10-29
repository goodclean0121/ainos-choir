"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createRateLimiter, signAccess, verifyPasscode } from "@/server/access";
import { cookieSecret } from "@/server/member";
import { ACCESS_COOKIE, ACCESS_MAX_AGE, safeNext } from "@/server/memberGate";
import { getServerStore } from "@/server/store";

const limiter = createRateLimiter({ limit: 10, windowMs: 60_000 });

export interface UnlockState {
  error?: string;
}

export async function unlock(_prev: UnlockState, form: FormData): Promise<UnlockState> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!limiter.hit(ip)) return { error: "여러 번 틀렸어요. 1분 뒤에 다시 해 주세요." };

  const access = await getServerStore().getAccess();
  if (!access) return { error: "아직 합창단 암호가 정해지지 않았어요. 관리자에게 물어봐 주세요." };
  if (!verifyPasscode(String(form.get("passcode") ?? ""), access.hash)) {
    return { error: "암호가 맞지 않아요. 지휘자나 임원에게 다시 확인해 주세요." };
  }

  (await cookies()).set(ACCESS_COOKIE, signAccess(access.version, cookieSecret()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.AINOS_TEST_MODE !== "1",
    maxAge: ACCESS_MAX_AGE,
    path: "/",
  });
  redirect(safeNext(String(form.get("next") ?? "/")));
}
