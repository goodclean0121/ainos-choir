import { describe, expect, it } from "vitest";
import { uiScale } from "@/ui/scale";

describe("uiScale", () => {
  it("keeps phones at 1", () => expect(uiScale(390, 844)).toBe(1));
  it("enlarges 1.6 times from 700 wide", () => expect(uiScale(820, 1180)).toBe(1.6));
  it("enlarges 2 times from 1100 wide when the screen is tall enough", () => expect(uiScale(1366, 1400)).toBe(2));
  it("lowers the size so at least 580 design pixels of height remain", () => {
    expect(uiScale(1180, 820)).toBe(1.4); // iPad landscape
    expect(uiScale(1280, 800)).toBe(1.35); // Galaxy Tab landscape
    expect(uiScale(1366, 1024)).toBe(1.75); // iPad Pro 12.9 landscape
  });
  it("keeps 1.6 on portrait tablets", () => {
    expect(uiScale(800, 1280)).toBe(1.6); // Galaxy Tab
    expect(uiScale(744, 1133)).toBe(1.6); // iPad mini
    expect(uiScale(1024, 1366)).toBe(1.6); // iPad Pro 12.9
  });
  it("never shrinks below 1", () => expect(uiScale(1200, 500)).toBe(1));
});
