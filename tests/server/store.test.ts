import { afterEach, describe, expect, it, vi } from "vitest";
import { fromRow } from "@/server/supabaseStore";
import { isTestMode } from "@/server/store";

afterEach(() => vi.unstubAllEnvs());

describe("test mode", () => {
  it("is off unless asked for", () => {
    vi.stubEnv("AINOS_TEST_MODE", "");
    expect(isTestMode()).toBe(false);
    vi.stubEnv("AINOS_TEST_MODE", "1");
    expect(isTestMode()).toBe(true);
  });

  it("refuses to run next to a real Supabase project", () => {
    vi.stubEnv("AINOS_TEST_MODE", "1");
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_x");
    expect(() => isTestMode()).toThrow();
  });
});

describe("supabase rows", () => {
  it("map to song records", () => {
    expect(
      fromRow({
        id: "1", title: "t", xml: "<x/>", roles: { P1: "S" }, status: "published",
        experimental: true, checked: true, created_at: "c", updated_at: "u",
      }),
    ).toEqual({
      id: "1", title: "t", xml: "<x/>", roles: { P1: "S" }, status: "published",
      experimental: true, checked: true, createdAt: "c", updatedAt: "u",
    });
  });
});
