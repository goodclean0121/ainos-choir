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
  it("counts only failed tries, so a full choir on one Wi-Fi can still get in", () => {
    const limiter = createRateLimiter({ limit: 10, windowMs: 60_000, now: () => 0 });
    for (let i = 0; i < 40; i++) expect(limiter.blocked("church")).toBe(false);
    for (let i = 0; i < 10; i++) limiter.fail("church");
    expect(limiter.blocked("church")).toBe(true);
  });

  it("blocks a key after ten failures in a minute", () => {
    let now = 0;
    const limiter = createRateLimiter({ limit: 10, windowMs: 60_000, now: () => now });
    for (let i = 0; i < 10; i++) {
      expect(limiter.blocked("1.2.3.4")).toBe(false);
      limiter.fail("1.2.3.4");
    }
    expect(limiter.blocked("1.2.3.4")).toBe(true);
    expect(limiter.blocked("5.6.7.8")).toBe(false);
    now = 60_001;
    expect(limiter.blocked("1.2.3.4")).toBe(false);
  });
});
