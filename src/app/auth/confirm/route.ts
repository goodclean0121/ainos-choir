import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";
import { safeNext } from "@/server/memberGate";

/** Where the emailed login link lands: turns the link into an admin session. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get("next") ?? "/admin");
  const supabase = await createSessionClient();
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");

  // token_hash works even when the mail app opens the link in another browser.
  const { error } = tokenHash && type
    ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    : code
      ? await supabase.auth.exchangeCodeForSession(code)
      : { error: new Error("missing token") };

  return NextResponse.redirect(new URL(error ? "/admin/login?error=link" : next, request.url));
}
