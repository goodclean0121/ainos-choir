import type { ScoreModel } from "@/score/types";

interface Disposable {
  dispose(): void;
}

type Time = number | string;

/** The slice of Tone.js the player uses, so tests can pass a fake. */
export interface ToneLike {
  start(): Promise<void>;
  getTransport(): {
    PPQ: number;
    bpm: { value: number };
    loop: boolean;
    loopStart: unknown;
    loopEnd: unknown;
    schedule(cb: (time: number) => void, at: Time): unknown;
    start(): unknown;
    stop(): unknown;
    cancel(): unknown;
  };
  Channel: new (volume: number) => Disposable & { volume: { value: number }; toDestination(): unknown };
  PolySynth: new () => Disposable & {
    connect(node: unknown): unknown;
    toDestination(): unknown;
    triggerAttackRelease(freq: number, duration: number, time?: number): unknown;
  };
}

export interface PlayOptions {
  /** 0 (silent) … 1 (full) per part id; missing parts play at full volume. */
  volumes: Record<string, number>;
  /** 1 = written tempo, 0.5 = half speed. */
  tempoRatio: number;
  /** First and last timeline index (played order) to play; defaults to the whole song. */
  from?: number;
  to?: number;
  loop?: boolean;
  /** Called with the timeline index as each measure starts. */
  onMeasure?(index: number): void;
  /** Called when playback reaches the end (never while looping). */
  onEnd?(): void;
}

const midiToFrequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const toDecibels = (gain: number) => (gain <= 0 ? -Infinity : 20 * Math.log10(gain));
/** Leave a small gap so repeated notes are heard as separate notes. */
const ARTICULATION = 0.95;
const NOTE_SECONDS = 0.8;

export function createPlayer(model: ScoreModel, tone: ToneLike) {
  let nodes: Disposable[] = [];
  let channels = new Map<string, { volume: { value: number } }>();
  let noteSynth: InstanceType<ToneLike["PolySynth"]> | null = null;
  /** Bumped by every stop() (and so every play()); a play overtaken while starting does nothing. */
  let generation = 0;

  function stop() {
    generation++;
    const transport = tone.getTransport();
    transport.stop();
    transport.cancel();
    transport.loop = false;
    nodes.forEach((n) => n.dispose());
    nodes = [];
    channels = new Map();
  }

  function setVolume(partId: string, volume: number) {
    const channel = channels.get(partId);
    if (channel) channel.volume.value = toDecibels(volume);
  }

  function setTempo(tempoRatio: number) {
    tone.getTransport().bpm.value = model.tempo * tempoRatio;
  }

  async function play({ volumes, tempoRatio, from = 0, to, loop = false, onMeasure, onEnd }: PlayOptions) {
    stop();
    const mine = generation;
    await tone.start();
    // Another play() or a stop() came in while the audio was starting.
    if (mine !== generation) return;
    const transport = tone.getTransport();
    setTempo(tempoRatio);
    // Schedule in ticks so a tempo change applies to notes already scheduled.
    const ticks = (q: number) => `${Math.round(q * transport.PPQ)}i`;
    const seconds = (q: number) => (q * 60) / transport.bpm.value;

    const timeline = model.timeline;
    const last = Math.min(to ?? timeline.length - 1, timeline.length - 1);
    const first = Math.max(0, Math.min(from, last));
    const begin = timeline[first]?.start ?? 0;
    const end = timeline[last] ? timeline[last].start + timeline[last].length : begin;

    for (const part of model.parts) {
      const channel = new tone.Channel(toDecibels(volumes[part.id] ?? 1));
      channel.toDestination();
      const synth = new tone.PolySynth();
      synth.connect(channel);
      nodes.push(synth, channel);
      channels.set(part.id, channel);

      for (const note of model.notes) {
        if (note.partId !== part.id || note.start < begin || note.start >= end) continue;
        const freq = midiToFrequency(note.midi);
        const length = Math.min(note.duration, end - note.start);
        transport.schedule(
          (time) => synth.triggerAttackRelease(freq, seconds(length) * ARTICULATION, time),
          ticks(note.start - begin),
        );
      }
    }

    if (onMeasure) {
      for (let i = first; i <= last; i++) transport.schedule(() => onMeasure(i), ticks(timeline[i].start - begin));
    }
    if (loop) {
      transport.loop = true;
      transport.loopStart = ticks(0);
      transport.loopEnd = ticks(end - begin);
    } else if (onEnd) {
      transport.schedule(() => onEnd(), ticks(end - begin));
    }
    transport.start();
  }

  async function playNote(midi: number) {
    await tone.start();
    if (!noteSynth) {
      noteSynth = new tone.PolySynth();
      noteSynth.toDestination();
    }
    noteSynth.triggerAttackRelease(midiToFrequency(midi), NOTE_SECONDS);
  }

  return { play, stop, setVolume, setTempo, playNote };
}
