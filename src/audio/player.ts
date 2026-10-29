import type { ScoreModel } from "@/score/types";

interface Disposable {
  dispose(): void;
}

/** The slice of Tone.js the player uses, so tests can pass a fake. */
export interface ToneLike {
  start(): Promise<void>;
  getTransport(): {
    bpm: { value: number };
    schedule(cb: (time: number) => void, at: number): unknown;
    start(): unknown;
    stop(): unknown;
    cancel(): unknown;
  };
  Channel: new (volume: number) => Disposable & { toDestination(): unknown };
  PolySynth: new () => Disposable & {
    connect(node: unknown): unknown;
    triggerAttackRelease(freq: number, duration: number, time: number): unknown;
  };
}

export interface PlayOptions {
  /** 0 (silent) … 1 (full) per part id; missing parts play at full volume. */
  volumes: Record<string, number>;
  /** 1 = written tempo, 0.5 = half speed. */
  tempoRatio: number;
}

const midiToFrequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const toDecibels = (gain: number) => 20 * Math.log10(gain);
/** Leave a small gap so repeated notes are heard as separate notes. */
const ARTICULATION = 0.95;

export function createPlayer(model: ScoreModel, tone: ToneLike) {
  let nodes: Disposable[] = [];

  function stop() {
    const transport = tone.getTransport();
    transport.stop();
    transport.cancel();
    nodes.forEach((n) => n.dispose());
    nodes = [];
  }

  async function play({ volumes, tempoRatio }: PlayOptions) {
    stop();
    await tone.start();
    const transport = tone.getTransport();
    const bpm = model.tempo * tempoRatio;
    transport.bpm.value = bpm;
    const secondsPerQuarter = 60 / bpm;

    for (const part of model.parts) {
      const volume = volumes[part.id] ?? 1;
      if (volume <= 0) continue;
      const channel = new tone.Channel(toDecibels(volume));
      channel.toDestination();
      const synth = new tone.PolySynth();
      synth.connect(channel);
      nodes.push(synth, channel);

      for (const note of model.notes) {
        if (note.partId !== part.id) continue;
        const freq = midiToFrequency(note.midi);
        const duration = note.duration * secondsPerQuarter * ARTICULATION;
        transport.schedule((time) => synth.triggerAttackRelease(freq, duration, time), note.start * secondsPerQuarter);
      }
    }
    transport.start();
  }

  return { play, stop };
}
