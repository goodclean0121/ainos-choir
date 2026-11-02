import { describe, expect, it } from "vitest";
import { matchesTitle } from "@/components/GroupPractice";

describe("matchesTitle", () => {
  it("ignores case and spaces", () => {
    expect(matchesTitle("A Wonderful Time Up There", "wonderfultime")).toBe(true);
    expect(matchesTitle("연습용 예제 (4성부 화음)", "연습 용")).toBe(true);
  });
  it("matches everything for an empty search", () => {
    expect(matchesTitle("아무 곡", "")).toBe(true);
  });
  it("rejects titles without the words", () => {
    expect(matchesTitle("A Wonderful Time Up There", "성탄")).toBe(false);
  });
});
