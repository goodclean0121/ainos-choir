import { afterEach, describe, expect, it, vi } from "vitest";
import { unlockAudio, resetUnlockForTests } from "@/audio/unlock";

afterEach(() => {
  resetUnlockForTests();
  vi.restoreAllMocks();
  delete (navigator as { audioSession?: unknown }).audioSession;
});

describe("unlockAudio", () => {
  it("asks iOS to treat the page as media playback, so the silent switch does not mute it", () => {
    (navigator as { audioSession?: { type: string } }).audioSession = { type: "auto" };
    unlockAudio({ start: vi.fn() });
    expect((navigator as unknown as { audioSession: { type: string } }).audioSession.type).toBe("playback");
  });

  it("starts the audio context inside the tap, without waiting", () => {
    const start = vi.fn(() => Promise.resolve());
    unlockAudio({ start });
    expect(start).toHaveBeenCalledTimes(1);
  });

  it("plays a silent media element once, for browsers without an audio session API", () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    unlockAudio({ start: vi.fn() });
    unlockAudio({ start: vi.fn() });
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("does not throw when the browser refuses", () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(new Error("NotAllowedError"));
    expect(() => unlockAudio({ start: () => Promise.reject(new Error("no")) })).not.toThrow();
  });
});
