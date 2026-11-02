import { describe, expect, it } from "vitest";
import { addSeconds, weekSeconds } from "@/practice/time";

describe("weekSeconds", () => {
  it("adds up Sunday to Saturday of today's week", () => {
    const log = { "2026-11-01": 600, "2026-11-04": 300, "2026-10-31": 999, "2026-11-08": 50 };
    expect(weekSeconds(log, "2026-11-02")).toBe(900);
  });
  it("is 0 with no log", () => expect(weekSeconds({}, "2026-11-02")).toBe(0));
});

describe("addSeconds", () => {
  it("adds to the day without touching others", () => {
    expect(addSeconds({ "2026-11-01": 10 }, "2026-11-02", 30)).toEqual({ "2026-11-01": 10, "2026-11-02": 30 });
    expect(addSeconds({ "2026-11-02": 10 }, "2026-11-02", 30)).toEqual({ "2026-11-02": 40 });
  });
});

import { songProgress, weekOf } from "@/practice/goals";

describe("weekOf", () => {
  it("names a week by its Sunday", () => {
    expect(weekOf("2026-11-04")).toBe("2026-11-01");
    expect(weekOf("2026-11-01")).toBe("2026-11-01");
  });
});

describe("songProgress", () => {
  it("is the share of this week's goals ticked for the song", () => {
    const ticks = new Set(["2026-11-01|A|notes", "2026-10-25|A|words"]);
    expect(songProgress(ticks, "2026-11-01", "A")).toBe(0.5);
    expect(songProgress(ticks, "2026-11-01", "B")).toBe(0);
  });
});
