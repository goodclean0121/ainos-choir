import { describe, expect, it } from "vitest";
import { dDay, upcoming } from "@/schedule/calendar";

describe("dDay", () => {
  it("is D-day on the day", () => expect(dDay("2026-11-04", "2026-11-04")).toBe("D-day"));
  it("counts days ahead", () => expect(dDay("2026-11-08", "2026-11-02")).toBe("D-6"));
  it("counts across a month end", () => expect(dDay("2026-12-02", "2026-11-30")).toBe("D-2"));
});

describe("upcoming", () => {
  const list = [
    { date: "2026-11-08", title: "a", kind: "performance" as const, songs: [] },
    { date: "2026-11-04", title: "b", kind: "practice" as const, songs: [] },
    { date: "2026-11-11", title: "c", kind: "practice" as const, songs: [] },
    { date: "2026-10-28", title: "d", kind: "practice" as const, songs: [] },
  ];
  it("lists future events of one kind, soonest first", () => {
    expect(upcoming(list, "2026-11-02", "practice").map((r) => r.title)).toEqual(["b", "c"]);
  });
  it("treats events without a kind as practice", () => {
    expect(upcoming([{ date: "2026-11-05", title: "x", songs: [] }], "2026-11-02", "practice")).toHaveLength(1);
  });
});
