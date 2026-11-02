import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { hashPasscode } from "./access";
import { createMemoryStore } from "./memoryStore";
import type { SongStore } from "./songStore";
import { createSupabaseStore } from "./supabaseStore";

/** Passcode the test-mode store starts with. */
export const TEST_PASSCODE = "test-choir";

/**
 * Test mode swaps Supabase for an in-memory store and a stand-in admin, for e2e tests.
 * It must never run where a real project is configured.
 */
export function isTestMode(): boolean {
  if (process.env.AINOS_TEST_MODE !== "1") return false;
  if (process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("AINOS_TEST_MODE cannot be used with a Supabase project configured.");
  }
  return true;
}

const globalStore = globalThis as { ainosTestStore?: SongStore };

function testStore(): SongStore {
  globalStore.ainosTestStore ??= createMemoryStore({
    songs: [
      {
        title: "연습용 예제 (4성부 화음 연습)",
        xml: readFileSync(join(process.cwd(), "src", "server", "seed", "practice-example.musicxml"), "utf8"),
        roles: {},
        experimental: false,
        status: "published",
      },
    ],
    access: { hash: hashPasscode(TEST_PASSCODE), version: 1 },
  });
  return globalStore.ainosTestStore;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} 환경 변수가 없어요. README의 Supabase 설정을 확인하세요.`);
  return value;
}

/** Server-only store that reads past row-level security: use it for member reads and passcode checks only. */
export function getServerStore(): SongStore {
  if (isTestMode()) return testStore();
  const client = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return createSupabaseStore(client);
}

export { testStore as getTestStore };
