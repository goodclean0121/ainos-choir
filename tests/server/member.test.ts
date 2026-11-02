import { describe, expect, it } from "vitest";
import { signAccess } from "@/server/access";
import { accessGranted, safeNext } from "@/server/memberGate";

const secret = "x".repeat(32);

describe("member gate", () => {
  it("lets in a device that entered the current passcode", () => {
    expect(accessGranted(signAccess(2, secret), { hash: "h", version: 2 }, secret)).toBe(true);
  });

  it("asks again after the passcode changes", () => {
    expect(accessGranted(signAccess(1, secret), { hash: "h", version: 2 }, secret)).toBe(false);
  });

  it("keeps everyone out while no passcode is set", () => {
    expect(accessGranted(signAccess(1, secret), null, secret)).toBe(false);
    expect(accessGranted(undefined, { hash: "h", version: 1 }, secret)).toBe(false);
  });

  it("only returns to pages on this site", () => {
    expect(safeNext("/songs/abc")).toBe("/songs/abc");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext(null)).toBe("/");
    expect(safeNext("/\t/evil.example")).toBe("/");
    expect(safeNext("/%09/evil.example")).toBe("/%09/evil.example");
    expect(safeNext("/\\evil.example")).toBe("/");
    expect(safeNext("/songs/a?x=1#y")).toBe("/songs/a?x=1#y");
  });
});
