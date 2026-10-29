import { describe, expect, it } from "vitest";
import { createLatest } from "@/score/latest";

describe("createLatest", () => {
  it("only the most recent request stays current", () => {
    const latest = createLatest();
    const a = latest.begin();
    const b = latest.begin();
    expect(a.isCurrent()).toBe(false);
    expect(b.isCurrent()).toBe(true);
  });

  it("starting a new request aborts the previous one", () => {
    const latest = createLatest();
    const a = latest.begin();
    latest.begin();
    expect(a.signal.aborted).toBe(true);
  });

  it("cancel aborts the current request and leaves nothing current", () => {
    const latest = createLatest();
    const a = latest.begin();
    latest.cancel();
    expect(a.signal.aborted).toBe(true);
    expect(a.isCurrent()).toBe(false);
  });
});
