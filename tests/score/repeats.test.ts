import { describe, expect, it } from "vitest";
import { expandRepeats } from "@/score/repeats";

describe("expandRepeats", () => {
  it("plays first and second endings in order", () => {
    const marks = [
      { number: 1, forward: true },
      { number: 2 },
      { number: 3, endings: [1], backward: true },
      { number: 4, endings: [2] },
    ];
    expect(expandRepeats(marks)).toEqual([1, 2, 3, 1, 2, 4]);
  });

  it("plays straight through without repeats", () => {
    expect(expandRepeats([{ number: 1 }, { number: 2 }, { number: 3 }, { number: 4 }])).toEqual([1, 2, 3, 4]);
  });

  it("repeats from the beginning when there is no forward repeat", () => {
    expect(expandRepeats([{ number: 1 }, { number: 2, backward: true }, { number: 3 }])).toEqual([1, 2, 1, 2, 3]);
  });

  it("handles two separate repeated sections each with endings", () => {
    const marks = [
      { number: 1, forward: true },
      { number: 2, endings: [1], backward: true },
      { number: 3, endings: [2] },
      { number: 4, forward: true },
      { number: 5, endings: [1], backward: true },
      { number: 6, endings: [2] },
    ];
    expect(expandRepeats(marks)).toEqual([1, 2, 1, 3, 4, 5, 4, 6]);
  });

  it("plays the second ending when the repeat goes back to the start with no forward sign", () => {
    const marks = [{ number: 1 }, { number: 2, endings: [1], backward: true }, { number: 3, endings: [2] }, { number: 4 }];
    expect(expandRepeats(marks)).toEqual([1, 2, 1, 3, 4]);
  });

  it("honours a later forward repeat after an earlier jump to the start", () => {
    const marks = [{ number: 1 }, { number: 2, backward: true }, { number: 3 }, { number: 4, forward: true }, { number: 5, backward: true }];
    expect(expandRepeats(marks)).toEqual([1, 2, 1, 2, 3, 4, 5, 4, 5]);
  });

  it("repeats as many times as the endings ask for", () => {
    const marks = [{ number: 1 }, { number: 2, endings: [1, 2], backward: true }, { number: 3, endings: [3] }];
    expect(expandRepeats(marks)).toEqual([1, 2, 1, 2, 1, 3]);
  });

  it("follows repeat times without endings", () => {
    expect(expandRepeats([{ number: 1, forward: true }, { number: 2, backward: true, times: 3 }, { number: 3 }])).toEqual([1, 2, 1, 2, 1, 2, 3]);
  });
});
