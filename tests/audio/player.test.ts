import { describe, expect, it } from "vitest";
import { createPlayer, type ToneLike } from "@/audio/player";
import type { ScoreModel } from "@/score/types";

const part = (id: string, name: string) => ({
  id, name, sourceName: name, sourcePartId: id, staff: 1, voiceSlot: "only" as const, line: 0, lineCount: 1,
});

// Three measures in played order: m1, m2, m1 (a repeat). Tempo 120 → 0.5 s per quarter.
const model: ScoreModel = {
  title: "t",
  tempo: 120,
  keys: [],
  measureCount: 2,
  lineNotes: {},
  timeline: [
    { measure: 1, start: 0, length: 4 },
    { measure: 2, start: 4, length: 4 },
    { measure: 1, start: 8, length: 4 },
  ],
  parts: [part("S", "Soprano"), part("B", "Bass")],
  notes: [
    { partId: "S", midi: 69, start: 0, duration: 1, measure: 1 },
    { partId: "S", midi: 71, start: 1, duration: 1, measure: 1 },
    { partId: "B", midi: 45, start: 0, duration: 2, measure: 1 },
    { partId: "S", midi: 72, start: 4, duration: 4, measure: 2 },
    { partId: "S", midi: 69, start: 8, duration: 1, measure: 1 },
  ],
};

const PPQ = 192;
const quarters = (at: string | number) => parseInt(String(at), 10) / PPQ;

function fakeTone() {
  const scheduled: { at: string | number; cb: (time: number) => void }[] = [];
  const played: { freq: number; dur: number; time?: number }[] = [];
  const channels: { volume: { value: number } }[] = [];
  const transport = {
    PPQ,
    bpm: { value: 0 },
    loop: false,
    loopStart: 0 as string | number,
    loopEnd: 0 as string | number,
    schedule: (cb: (time: number) => void, at: string | number) => scheduled.push({ at, cb }),
    start: () => {},
    stop: () => {},
    cancel: () => {},
  };
  const tone: ToneLike = {
    start: async () => {},
    getTransport: () => transport,
    Channel: class {
      volume: { value: number };
      constructor(volume: number) {
        this.volume = { value: volume };
        channels.push(this);
      }
      toDestination() {
        return this;
      }
      dispose() {}
    } as unknown as ToneLike["Channel"],
    PolySynth: class {
      connect() {
        return this;
      }
      toDestination() {
        return this;
      }
      triggerAttackRelease(freq: number, dur: number, time?: number) {
        played.push({ freq, dur, time });
      }
      dispose() {}
    } as unknown as ToneLike["PolySynth"],
  };
  return { tone, transport, scheduled, played, channels };
}

const noteEvents = (f: ReturnType<typeof fakeTone>) => {
  f.played.length = 0;
  const out = f.scheduled.map((s) => {
    const before = f.played.length;
    s.cb(0);
    return f.played.length > before ? { at: quarters(s.at), freq: Math.round(f.played[before].freq) } : null;
  });
  return out.filter((x) => x !== null);
};

describe("createPlayer", () => {
  it("plays every part so a muted one can be turned up later", async () => {
    const f = fakeTone();
    await createPlayer(model, f.tone).play({ volumes: { S: 1, B: 0 }, tempoRatio: 1 });
    expect(f.channels).toHaveLength(2);
    expect(f.channels[1].volume.value).toBe(-Infinity);
    expect(noteEvents(f)).toHaveLength(5);
  });

  it("sets the tempo by the ratio and schedules notes in musical time", async () => {
    const f = fakeTone();
    await createPlayer(model, f.tone).play({ volumes: {}, tempoRatio: 0.5 });
    expect(f.transport.bpm.value).toBe(60);
    expect(noteEvents(f).map((e) => e.at).sort((a, b) => a - b)).toEqual([0, 0, 1, 4, 8]);
  });

  it("sets each part's channel volume in decibels", async () => {
    const f = fakeTone();
    await createPlayer(model, f.tone).play({ volumes: { S: 1, B: 0.5 }, tempoRatio: 1 });
    expect(f.channels[0].volume.value).toBe(0);
    expect(f.channels[1].volume.value).toBeCloseTo(-6.02, 1);
  });

  it("changes a part's volume while playing", async () => {
    const f = fakeTone();
    const player = createPlayer(model, f.tone);
    await player.play({ volumes: { S: 1, B: 1 }, tempoRatio: 1 });
    player.setVolume("B", 0.5);
    expect(f.channels[1].volume.value).toBeCloseTo(-6.02, 1);
    player.setVolume("B", 0);
    expect(f.channels[1].volume.value).toBe(-Infinity);
  });

  it("changes the tempo while playing", async () => {
    const f = fakeTone();
    const player = createPlayer(model, f.tone);
    await player.play({ volumes: {}, tempoRatio: 1 });
    player.setTempo(0.75);
    expect(f.transport.bpm.value).toBe(90);
  });

  it("plays only the chosen section, in played order, starting at zero", async () => {
    const f = fakeTone();
    // timeline 1..2 = m2 then the repeated m1
    await createPlayer(model, f.tone).play({ volumes: {}, tempoRatio: 1, from: 1, to: 2 });
    expect(noteEvents(f)).toEqual([
      { at: 0, freq: 523 },
      { at: 4, freq: 440 },
    ]);
  });

  it("loops the section", async () => {
    const f = fakeTone();
    await createPlayer(model, f.tone).play({ volumes: {}, tempoRatio: 1, from: 0, to: 1, loop: true });
    expect(f.transport.loop).toBe(true);
    expect(quarters(f.transport.loopStart)).toBe(0);
    expect(quarters(f.transport.loopEnd)).toBe(8);
  });

  it("announces each measure of the section and the end", async () => {
    const f = fakeTone();
    const measures: number[] = [];
    let ended = 0;
    await createPlayer(model, f.tone).play({
      volumes: {}, tempoRatio: 1, from: 1, to: 2,
      onMeasure: (i) => measures.push(i),
      onEnd: () => ended++,
    });
    f.scheduled.forEach((s) => s.cb(0));
    expect(measures).toEqual([1, 2]);
    expect(ended).toBe(1);
    const endAt = f.scheduled.map((s) => quarters(s.at)).sort((a, b) => a - b).at(-1);
    expect(endAt).toBe(8);
  });

  it("does not announce an end while looping", async () => {
    const f = fakeTone();
    let ended = 0;
    await createPlayer(model, f.tone).play({ volumes: {}, tempoRatio: 1, loop: true, onEnd: () => ended++ });
    f.scheduled.forEach((s) => s.cb(0));
    expect(ended).toBe(0);
  });

  it("plays a single note right away", async () => {
    const f = fakeTone();
    await createPlayer(model, f.tone).playNote(69);
    expect(f.played).toHaveLength(1);
    expect(Math.round(f.played[0].freq)).toBe(440);
  });
});
