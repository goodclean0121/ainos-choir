import { describe, expect, it } from "vitest";
import { fifthsAt, noteLabel, toMidi } from "@/score/noteName";

describe("note names", () => {
  it("labels a note with its movable-do name and letter name", () => {
    expect(noteLabel({ step: "D", alter: 0, octave: 5 }, 1)).toBe("솔 (D5)");
    expect(noteLabel({ step: "F", alter: 1, octave: 4 }, 0)).toBe("파# (F#4)");
    expect(noteLabel({ step: "B", alter: -1, octave: 3 }, -1)).toBe("파 (B♭3)");
  });

  it("finds the key in force at a measure", () => {
    const keys = [
      { measure: 1, fifths: 0, mode: "major" as const },
      { measure: 5, fifths: 2, mode: "major" as const },
    ];
    expect(fifthsAt(keys, 4)).toBe(0);
    expect(fifthsAt(keys, 5)).toBe(2);
    expect(fifthsAt([], 3)).toBe(0);
  });

  it("converts to MIDI numbers", () => {
    expect(toMidi({ step: "A", alter: 0, octave: 4 })).toBe(69);
    expect(toMidi({ step: "C", alter: 1, octave: 4 })).toBe(61);
  });
});
