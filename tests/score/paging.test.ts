import { describe, expect, it } from "vitest";
import { ZOOM_STEPS, defaultZoom, fitZoom, pageAt, stepZoom, tapTurn } from "@/score/paging";

describe("pageAt", () => {
  it("rounds a scroll position to the nearest page", () => {
    expect(pageAt(0, 800, 3)).toBe(0);
    expect(pageAt(390, 800, 3)).toBe(0);
    expect(pageAt(420, 800, 3)).toBe(1);
    expect(pageAt(1600, 800, 3)).toBe(2);
  });

  it("stays inside the pages there are", () => {
    expect(pageAt(5000, 800, 3)).toBe(2);
    expect(pageAt(-40, 800, 3)).toBe(0);
    expect(pageAt(100, 0, 3)).toBe(0);
  });
});

describe("stepZoom", () => {
  it("moves one step up or down the list", () => {
    expect(stepZoom(1, 1)).toBe(ZOOM_STEPS[ZOOM_STEPS.indexOf(1) + 1]);
    expect(stepZoom(1, -1)).toBe(ZOOM_STEPS[ZOOM_STEPS.indexOf(1) - 1]);
  });

  it("stops at the smallest and largest size", () => {
    expect(stepZoom(ZOOM_STEPS[0], -1)).toBe(ZOOM_STEPS[0]);
    expect(stepZoom(ZOOM_STEPS.at(-1)!, 1)).toBe(ZOOM_STEPS.at(-1));
  });

  it("snaps a size that is not on the list to the next one in that direction", () => {
    expect(stepZoom(0.95, 1)).toBe(1);
    expect(stepZoom(0.95, -1)).toBe(0.9);
    expect(stepZoom(0.62, 1)).toBe(0.65);
  });
});

describe("defaultZoom", () => {
  it("draws smaller on phones so a line holds more than one bar", () => {
    expect(defaultZoom(390)).toBe(0.6);
    expect(defaultZoom(820)).toBe(1);
  });
});

describe("fitZoom", () => {
  it("keeps the size when the system already fits", () => {
    expect(fitZoom(1, 800, 600)).toBe(1);
  });

  it("shrinks to the largest listed size at which the system fits", () => {
    // at 1 the system needs 1000px but only 600px are free: 0.6 fits exactly
    expect(fitZoom(1, 600, 1000)).toBe(0.6);
    expect(fitZoom(1, 640, 1000)).toBe(0.6);
    expect(fitZoom(1, 660, 1000)).toBe(0.65);
  });

  it("never goes below the smallest size", () => {
    expect(fitZoom(1, 100, 1000)).toBe(ZOOM_STEPS[0]);
  });
});

describe("tapTurn", () => {
  it("jumps to the first page from the left third and the last page from the right third", () => {
    expect(tapTurn(100, 900)).toBe("first");
    expect(tapTurn(800, 900)).toBe("last");
  });
  it("does nothing in the middle third, where people tap to read", () => {
    expect(tapTurn(450, 900)).toBeUndefined();
  });
});
