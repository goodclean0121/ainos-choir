import { describe, expect, it } from "vitest";
import { createRateLimiter, hashPasscode, readAccess, signAccess, verifyPasscode } from "@/server/access";

describe("choir passcode", () => {
  it("accepts the right passcode and ignores surrounding spaces", () => {
    const stored = hashPasscode("주님찬양");
    expect(stored).not.toContain("주님찬양");
    expect(verifyPasscode("주님찬양", stored)).toBe(true);
    expect(verifyPasscode("  주님찬양 ", stored)).toBe(true);
    expect(verifyPasscode("주님", stored)).toBe(false);
    expect(verifyPasscode("주님찬양", "garbage")).toBe(false);
  });

  it("salts each hash", () => {
    expect(hashPasscode("a")).not.toBe(hashPasscode("a"));
  });
});

describe("access cookie", () => {
  const secret = "s".repeat(32);

  it("round-trips the passcode version", () => {
    expect(readAccess(signAccess(3, secret), secret)).toBe(3);
  });

  it("rejects forged or foreign cookies", () => {
    const cookie = signAccess(3, secret);
    expect(readAccess(cookie.replace(/^3\./, "4."), secret)).toBeNull();
    expect(readAccess(cookie, "t".repeat(32))).toBeNull();
    expect(readAccess("nonsense", secret)).toBeNull();
    expect(readAccess(undefined, secret)).toBeNull();
  });
});

describe("rate limiter", () => {
  it("allows ten tries a minute per key", () => {
    let now = 0;
    const limiter = createRateLimiter({ limit: 10, windowMs: 60_000, now: () => now });
    for (let i = 0; i < 10; i++) expect(limiter.hit("1.2.3.4")).toBe(true);
    expect(limiter.hit("1.2.3.4")).toBe(false);
    expect(limiter.hit("5.6.7.8")).toBe(true);
    now = 60_001;
    expect(limiter.hit("1.2.3.4")).toBe(true);
  });
});
