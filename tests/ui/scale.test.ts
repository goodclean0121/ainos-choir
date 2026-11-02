import { describe, expect, it } from "vitest";
import { uiScale } from "@/ui/scale";

describe("uiScale", () => {
  it("keeps phones at 1", () => expect(uiScale(390, 844)).toBe(1));
  it("enlarges 1.6 times from 700 wide", () => expect(uiScale(820, 1180)).toBe(1.6));
  it("enlarges 2 times from 1100 wide when the screen is tall enough", () => expect(uiScale(1366, 1400)).toBe(2));
  it("lowers the size so at least 640 design pixels of height remain", () => {
    expect(uiScale(1180, 820)).toBe(1.25);
  });
  it("never shrinks below 1", () => expect(uiScale(1200, 500)).toBe(1));
});
