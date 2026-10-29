"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScoreView, type TappedNote } from "@/components/ScoreView";
import { createPlayer } from "@/audio/player";
import { decorateScore } from "@/score/decorate";
import { findMarkings, type GlossaryEntry } from "@/score/glossary";
import { fifthsAt, noteLabel, toMidi } from "@/score/noteName";
import { parseMusicXml } from "@/score/parseMusicXml";
import { assignRoles } from "@/score/roles";
import type { PartInfo, ScoreModel } from "@/score/types";
import { loadSong } from "@/songs/loadSong";
import { recallPart, rememberPart } from "@/songs/myPart";

const OTHER_VOLUME = 0.35;
const TEMPOS = [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2];
const FAMILY: Record<string, { name: string; css: string }> = {
  S: { name: "소프라노", css: "soprano" },
  A: { name: "알토", css: "alto" },
  T: { name: "테너", css: "tenor" },
  B: { name: "베이스", css: "bass" },
};

interface Loaded {
  title: string;
  xml: string;
  model: ScoreModel;
  roles: Record<string, string>;
  markings: GlossaryEntry[];
}

function partLabel(part: PartInfo, role: string | undefined, index: number) {
  const family = role ? FAMILY[role[0]] : undefined;
  if (family) return family.name + role!.slice(1).replace(/^(\d)$/, " $1");
  return part.name || `${index + 1}번째 줄`;
}

function defaultVolumes(model: ScoreModel, mine: string | undefined) {
  return Object.fromEntries(model.parts.map((p) => [p.id, !mine || p.id === mine ? 1 : OTHER_VOLUME]));
}

export function Practice({ params }: { params: Promise<{ id: string }> }) {
  const songId = decodeURIComponent(use(params).id);
  const [song, setSong] = useState<Loaded>();
  const [error, setError] = useState<string>();
  const [myPart, setMyPart] = useState<string>();
  const [solfegeOn, setSolfegeOn] = useState(false);
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [tempoRatio, setTempoRatio] = useState(1);
  const [loopOn, setLoopOn] = useState(false);
  const [range, setRange] = useState<[number, number]>([0, 0]);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState<number | null>(null);
  const [tapped, setTapped] = useState<string>();
  const [marking, setMarking] = useState<GlossaryEntry>();
  const player = useRef<ReturnType<typeof createPlayer> | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSong(songId)
      .then((s) => {
        if (cancelled) return;
        const model = parseMusicXml(s.xml);
        const recalled = recallPart(songId);
        const mine = model.parts.some((p) => p.id === recalled) ? recalled : undefined;
        setSong({
          title: s.title,
          xml: s.xml,
          model,
          roles: s.roles ?? assignRoles(model.parts),
          markings: findMarkings(s.xml),
        });
        setMyPart(mine);
        setVolumes(defaultVolumes(model, mine));
        setRange([0, Math.max(0, model.timeline.length - 1)]);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "곡을 불러오지 못했어요");
      });
    return () => {
      cancelled = true;
      player.current?.stop();
    };
  }, [songId]);

  const scoreXml = useMemo(() => {
    if (!song || !myPart) return song?.xml;
    return decorateScore(song.xml, { notes: song.model.lineNotes[myPart] ?? [], solfege: solfegeOn });
  }, [song, myPart, solfegeOn]);

  async function getPlayer() {
    if (!song) return null;
    if (!player.current) {
      const Tone = await import("tone");
      player.current = createPlayer(song.model, Tone);
    }
    return player.current;
  }

  async function play(opts: { loop?: boolean; from?: number; to?: number } = {}) {
    const p = await getPlayer();
    if (!p) return;
    const loop = opts.loop ?? loopOn;
    const [from, to] = loop ? [opts.from ?? range[0], opts.to ?? range[1]] : [0, undefined];
    await p.play({
      volumes,
      tempoRatio,
      from,
      to,
      loop,
      onMeasure: setCurrent,
      onEnd: () => {
        setPlaying(false);
        setCurrent(null);
      },
    });
    setPlaying(true);
  }

  function stop() {
    player.current?.stop();
    setPlaying(false);
    setCurrent(null);
  }

  function choosePart(id: string) {
    setMyPart(id);
    rememberPart(songId, id);
    if (!song) return;
    const next = defaultVolumes(song.model, id);
    setVolumes(next);
    Object.entries(next).forEach(([pid, v]) => player.current?.setVolume(pid, v));
  }

  function changeVolume(id: string, v: number) {
    setVolumes((prev) => ({ ...prev, [id]: v }));
    player.current?.setVolume(id, v);
  }

  function changeTempo(ratio: number) {
    setTempoRatio(ratio);
    if (playing) player.current?.setTempo(ratio);
  }

  function changeLoop(next: { on?: boolean; from?: number; to?: number }) {
    const on = next.on ?? loopOn;
    let from = next.from ?? range[0];
    let to = next.to ?? range[1];
    if (next.from !== undefined && to < from) to = from;
    if (next.to !== undefined && from > to) from = to;
    setLoopOn(on);
    setRange([from, to]);
    if (playing) void play({ loop: on, from, to });
  }

  const onNoteTap = useCallback(
    (note: TappedNote) => {
      if (!song) return;
      setTapped(noteLabel(note, fifthsAt(song.model.keys, note.measure)));
      void getPlayer().then((p) => p?.playNote(toMidi(note)));
    },
    // getPlayer reads the latest song through the closure
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [song],
  );

  if (error) {
    return (
      <div className="notice notice-error" role="alert">
        <p>{error}</p>
      </div>
    );
  }
  if (!song || !scoreXml) return <p role="status">곡을 불러오고 있어요…</p>;

  const { model, roles, markings } = song;
  const seen = new Map<number, number>();
  const measureOptions = model.timeline.map((t, i) => {
    const n = (seen.get(t.measure) ?? 0) + 1;
    seen.set(t.measure, n);
    return { value: i, label: n > 1 ? `${t.measure}마디 (${n}번째)` : `${t.measure}마디` };
  });
  const cursorMeasure = current == null ? null : (model.timeline[current]?.measure ?? null);

  return (
    <>
      <h1>{song.title}</h1>

      <section className="my-part" aria-labelledby="my-part-title">
        <h2 id="my-part-title">내 파트</h2>
        {!myPart && <p className="hint">부를 파트를 고르면 그 파트 음표만 진하게 보여요.</p>}
        <div className="part-picker">
          {model.parts.map((p, i) => {
            const role = roles[p.id];
            const css = FAMILY[role?.[0] ?? ""]?.css ?? "unknown";
            return (
              <button
                key={p.id}
                type="button"
                className={`part-choice part-${css}`}
                aria-pressed={myPart === p.id}
                onClick={() => choosePart(p.id)}
              >
                {partLabel(p, role, i)}
              </button>
            );
          })}
        </div>
      </section>

      <div className="practice-tools">
        <button
          type="button"
          className="toggle"
          aria-pressed={solfegeOn}
          disabled={!myPart}
          onClick={() => setSolfegeOn((v) => !v)}
        >
          계이름 표시
        </button>
        {!myPart && <span className="hint">파트를 고르면 계이름을 볼 수 있어요.</span>}
      </div>

      {markings.length > 0 && (
        <section className="markings" aria-labelledby="markings-title">
          <h2 id="markings-title">이 곡의 기호</h2>
          <div className="marking-chips">
            {markings.map((m) => (
              <button
                key={m.id}
                type="button"
                className="chip"
                aria-pressed={marking?.id === m.id}
                onClick={() => setMarking(marking?.id === m.id ? undefined : m)}
              >
                {m.symbol}
              </button>
            ))}
          </div>
          {marking && (
            <div className="marking-sheet" role="region" aria-label={`${marking.name} 설명`}>
              <p className="marking-name">
                <span className="marking-symbol">{marking.symbol}</span> {marking.name}
              </p>
              <p>{marking.meaning}</p>
            </div>
          )}
        </section>
      )}


      <p className="tap-hint">음표를 누르면 그 음을 들려줘요.</p>
      <ScoreView xml={scoreXml} onNoteTap={onNoteTap} cursorMeasure={cursorMeasure} />

      <details className="volumes">
        <summary>파트별 음량</summary>
        <ul>
          {model.parts.map((p, i) => (
            <li key={p.id}>
              <label>
                <span>{partLabel(p, roles[p.id], i)}</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volumes[p.id] ?? 1}
                  onChange={(e) => changeVolume(p.id, Number(e.target.value))}
                />
              </label>
            </li>
          ))}
        </ul>
      </details>

      <div className="play-bar" role="region" aria-label="재생">
        <p className="tapped" aria-live="polite">
          {tapped ? `누른 음: ${tapped}` : ""}
        </p>
        <div className="play-row">
          {playing ? (
            <button type="button" className="primary" onClick={stop}>
              정지
            </button>
          ) : (
            <button type="button" className="primary" onClick={() => play()}>
              듣기
            </button>
          )}
          <label>
            <span className="visually-hidden">빠르기</span>
            <select value={tempoRatio} onChange={(e) => changeTempo(Number(e.target.value))} aria-label="빠르기">
              {TEMPOS.map((t) => (
                <option key={t} value={t}>
                  {`빠르기 ${Math.round(t * 100)}%`}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="toggle" aria-pressed={loopOn} onClick={() => changeLoop({ on: !loopOn })}>
            구간 반복
          </button>
        </div>
        {loopOn && (
          <div className="play-row">
            <label>
              <span>처음</span>
              <select value={range[0]} onChange={(e) => changeLoop({ from: Number(e.target.value) })}>
                {measureOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>끝</span>
              <select value={range[1]} onChange={(e) => changeLoop({ to: Number(e.target.value) })}>
                {measureOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>
    </>
  );
}
