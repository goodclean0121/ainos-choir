"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";
import { createRateLimiter } from "@/server/access";
import { isTestMode } from "@/server/store";

export interface LoginState {
  error?: string;
  sent?: string;
}

const limiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });

/** Emails a one-time login link. Accounts are created only for listed admins; the database grants the role. */
export async function sendLoginLink(_prev: LoginState, form: FormData): Promise<LoginState> {
  if (isTestMode()) redirect("/admin");
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const h = await headers();
  if (!limiter.hit(h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local")) {
    return { error: "잠시 뒤에 다시 해 주세요." };
  }
  if (!admins.includes(email)) return { error: "관리자로 등록된 이메일이 아니에요." };

  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: `${origin}/auth/confirm?next=/admin` },
  });
  if (error) return { error: "메일을 보내지 못했어요. 잠시 뒤에 다시 해 주세요." };
  return { sent: `${email}로 로그인 링크를 보냈어요. 메일의 링크를 누르면 들어와요.` };
}
