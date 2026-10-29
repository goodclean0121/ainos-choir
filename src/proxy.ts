import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  if (process.env.AINOS_TEST_MODE === "1" || !process.env.NEXT_PUBLIC_SUPABASE_URL) return NextResponse.next();
  return updateSession(request);
}

export const config = { matcher: ["/admin/:path*", "/auth/:path*"] };
