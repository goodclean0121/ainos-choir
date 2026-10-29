import "server-only";
import { createSessionClient } from "@/lib/supabase/server";
import { getTestStore, isTestMode } from "./store";
import type { SongStore } from "./songStore";
import { createSupabaseStore } from "./supabaseStore";

export interface Admin {
  email: string;
}

/** The signed-in admin, or null. The role lives in app_metadata, which users cannot edit. */
export async function getAdmin(): Promise<Admin | null> {
  if (isTestMode()) return { email: "test-admin@example.com" };
  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims || (claims.app_metadata as { role?: string } | undefined)?.role !== "admin") return null;
  return { email: String(claims.email ?? "") };
}

/** Store acting as the admin: every write also passes the tables' row-level security. */
export async function getAdminStore(): Promise<SongStore> {
  if (isTestMode()) return getTestStore();
  return createSupabaseStore(await createSessionClient());
}
