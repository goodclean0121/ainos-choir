import { describe, expect, it } from "vitest";
import { solfege } from "@/score/solfege";

describe("solfege (movable do)", () => {
  it("C major", () => {
    expect(["C", "E", "B"].map((s) => solfege(s, 0, 0))).toEqual(["도", "미", "시"]);
    expect(solfege("F", 1, 0)).toBe("파#");
    expect(solfege("B", -1, 0)).toBe("시♭");
  });

  it("F major / D minor (one flat)", () => {
    expect(solfege("F", 0, -1)).toBe("도");
    expect(solfege("B", -1, -1)).toBe("파");
    expect(solfege("B", 0, -1)).toBe("파#");
    expect(solfege("E", 0, -1)).toBe("시");
    expect(solfege("D", 0, -1)).toBe("라");
  });

  it("D major (two sharps)", () => {
    expect(solfege("D", 0, 2)).toBe("도");
    expect(solfege("F", 1, 2)).toBe("미");
    expect(solfege("F", 0, 2)).toBe("미♭");
    expect(solfege("C", 1, 2)).toBe("시");
  });

  it("E-flat major (three flats)", () => {
    expect(solfege("E", -1, -3)).toBe("도");
    expect(solfege("A", -1, -3)).toBe("파");
    expect(solfege("A", 0, -3)).toBe("파#");
  });

  it("G-flat major (six flats) and C-sharp major (seven sharps)", () => {
    expect(solfege("G", -1, -6)).toBe("도");
    expect(solfege("C", -1, -6)).toBe("파");
    expect(solfege("C", 1, 7)).toBe("도");
    expect(solfege("B", 1, 7)).toBe("시");
  });
});
