import { describe, expect, it } from "vitest";
import { createPlayer, type ToneLike } from "@/audio/player";
import type { ScoreModel } from "@/score/types";

const model: ScoreModel = {
  title: "t",
  tempo: 120,
  keys: [],
  measureCount: 1,
  parts: [
    { id: "S", name: "Soprano", sourcePartId: "P1", staff: 1, voiceSlot: "only" },
    { id: "B", name: "Bass", sourcePartId: "P2", staff: 1, voiceSlot: "only" },
  ],
  notes: [
    { partId: "S", midi: 69, start: 0, duration: 1, measure: 1 },
    { partId: "S", midi: 71, start: 1, duration: 1, measure: 1 },
    { partId: "B", midi: 45, start: 0, duration: 2, measure: 1 },
  ],
};

function fakeTone() {
  const scheduled: { at: number; cb: (time: number) => void }[] = [];
  const played: { synth: number; freq: number; dur: number }[] = [];
  const channels: number[] = [];
  let synths = 0;
  const transport = {
    bpm: { value: 0 },
    schedule: (cb: (time: number) => void, at: number) => scheduled.push({ at, cb }),
    start: () => {},
    stop: () => {},
    cancel: () => {},
  };
  const tone: ToneLike = {
    start: async () => {},
    getTransport: () => transport,
    Channel: class {
      constructor(volume: number) {
        channels.push(volume);
      }
      toDestination() {
        return this;
      }
      dispose() {}
    } as unknown as ToneLike["Channel"],
    PolySynth: class {
      id = ++synths;
      connect() {
        return this;
      }
      triggerAttackRelease(freq: number, dur: number) {
        played.push({ synth: this.id, freq, dur });
      }
      dispose() {}
    } as unknown as ToneLike["PolySynth"],
  };
  return { tone, transport, scheduled, played, channels };
}

describe("createPlayer", () => {
  it("does not schedule parts that are turned all the way down", async () => {
    const f = fakeTone();
    await createPlayer(model, f.tone).play({ volumes: { S: 1, B: 0 }, tempoRatio: 1 });
    expect(f.scheduled).toHaveLength(2);
    f.scheduled.forEach((s) => s.cb(0));
    expect(f.played.map((p) => Math.round(p.freq))).toEqual([440, 494]);
  });

  it("slows the tempo by the ratio and places notes in seconds", async () => {
    const f = fakeTone();
    await createPlayer(model, f.tone).play({ volumes: { S: 1, B: 1 }, tempoRatio: 0.5 });
    expect(f.transport.bpm.value).toBe(60);
    expect(f.scheduled.map((s) => s.at).sort()).toEqual([0, 0, 1]);
  });

  it("sets each part's channel volume in decibels", async () => {
    const f = fakeTone();
    await createPlayer(model, f.tone).play({ volumes: { S: 1, B: 0.5 }, tempoRatio: 1 });
    expect(f.channels[0]).toBe(0);
    expect(f.channels[1]).toBeCloseTo(-6.02, 1);
  });
});
