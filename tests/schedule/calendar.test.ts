import { describe, expect, it } from "vitest";
import { dayKey, monthGrid, nextRehearsal, type Rehearsal } from "@/schedule/calendar";

describe("dayKey", () => {
  it("writes a local date as YYYY-MM-DD", () => {
    expect(dayKey(new Date(2026, 10, 2))).toBe("2026-11-02");
  });
});

describe("monthGrid", () => {
  it("starts on Sunday and pads with the neighbouring months", () => {
    const weeks = monthGrid(2026, 10); // November 2026 starts on a Sunday
    expect(weeks[0][0]).toEqual({ key: "2026-11-01", day: 1, inMonth: true });
    expect(weeks.at(-1)!.at(-1)).toEqual({ key: "2026-12-05", day: 5, inMonth: false });
    expect(weeks).toHaveLength(5);
  });
  it("fills the first week from the previous month", () => {
    const weeks = monthGrid(2026, 11); // December 2026 starts on a Tuesday
    expect(weeks[0].slice(0, 3).map((d) => d.key)).toEqual(["2026-11-29", "2026-11-30", "2026-12-01"]);
    expect(weeks[0][0].inMonth).toBe(false);
  });
  it("has seven days in every week", () => {
    for (const week of monthGrid(2027, 1)) expect(week).toHaveLength(7);
  });
});

describe("nextRehearsal", () => {
  const list: Rehearsal[] = [
    { date: "2026-11-08", title: "주일 연습", songs: [] },
    { date: "2026-11-01", title: "지난 연습", songs: [] },
    { date: "2026-11-15", title: "다음다음", songs: [] },
  ];
  it("picks the soonest one from today on", () => {
    expect(nextRehearsal(list, "2026-11-02")?.title).toBe("주일 연습");
  });
  it("counts today", () => {
    expect(nextRehearsal(list, "2026-11-08")?.title).toBe("주일 연습");
  });
  it("is undefined when everything is past", () => {
    expect(nextRehearsal(list, "2026-12-01")).toBeUndefined();
  });
});
