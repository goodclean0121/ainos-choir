"use client";

import { useRef, useState } from "react";
import { PartList } from "@/components/PartList";
import { ScoreView } from "@/components/ScoreView";
import { createPlayer } from "@/audio/player";
import { importScore, type ImportResult } from "@/score/importScore";
import type { ScoreFormat } from "@/score/types";

const ACCEPT = ".musicxml,.xml,.mxl,.mscz,.mscx,.mid,.midi,.pdf,.png,.jpg,.jpeg";

const FORMAT_LABEL: Record<ScoreFormat, string> = {
  musicxml: "MusicXML",
  mxl: "압축 MusicXML",
  musescore: "MuseScore",
  midi: "MIDI",
  pdf: "PDF (자동 인식)",
  image: "사진 (자동 인식)",
};

const NEEDS_CONVERTER = /\.(mscz|mscx|mid|midi|pdf|png|jpe?g)$/i;

type Status = { kind: "idle" } | { kind: "working"; message: string } | { kind: "error"; message: string };

export function ImportScore({ converterUrl }: { converterUrl?: string }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [result, setResult] = useState<ImportResult>();
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [tempoRatio, setTempoRatio] = useState(1);
  const [playing, setPlaying] = useState(false);
  const lastFile = useRef<File | null>(null);
  const player = useRef<ReturnType<typeof createPlayer> | null>(null);

  async function load(file: File) {
    lastFile.current = file;
    player.current?.stop();
    setPlaying(false);
    setResult(undefined);
    setStatus({
      kind: "working",
      message: NEEDS_CONVERTER.test(file.name) ? "악보를 변환하고 있어요… 사진·PDF는 몇 분 걸릴 수 있어요." : "악보를 읽고 있어요…",
    });
    try {
      const imported = await importScore(file, { converterUrl });
      setResult(imported);
      setRoles(imported.roles);
      setVolumes(Object.fromEntries(imported.model.parts.map((p) => [p.id, 1])));
      setStatus({ kind: "idle" });
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "악보를 읽지 못했어요." });
    }
  }

  async function play(nextVolumes: Record<string, number>) {
    if (!result) return;
    const Tone = await import("tone");
    player.current?.stop();
    player.current = createPlayer(result.model, Tone);
    await player.current.play({ volumes: nextVolumes, tempoRatio });
    setPlaying(true);
  }

  function stop() {
    player.current?.stop();
    setPlaying(false);
  }

  function solo(partId: string) {
    const next = Object.fromEntries(Object.keys(volumes).map((id) => [id, id === partId ? 1 : 0]));
    setVolumes(next);
    void play(next);
  }

  return (
    <>
      <div
        className="drop"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) void load(file);
        }}
      >
        <label className="drop-label">
          <span>악보 파일 고르기</span>
          <input
            type="file"
            accept={ACCEPT}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void load(file);
            }}
          />
        </label>
        <p className="drop-hint">MusicXML, MuseScore, MIDI, PDF, 사진(JPG·PNG)을 올릴 수 있어요. 파일을 여기로 끌어와도 돼요.</p>
      </div>

      {status.kind === "working" && (
        <p className="notice" role="status">
          {status.message}
        </p>
      )}
      {status.kind === "error" && (
        <div className="notice notice-error" role="alert">
          <p>{status.message}</p>
          {lastFile.current && (
            <button type="button" onClick={() => lastFile.current && load(lastFile.current)}>
              다시 시도
            </button>
          )}
        </div>
      )}

      {result && (
        <>
          <section className="summary" aria-label="가져온 악보">
            <h2>{result.model.title || lastFile.current?.name}</h2>
            <p>
              {FORMAT_LABEL[result.format]} 악보에서 파트 {result.model.parts.length}개, 마디 {result.model.measureCount}개를 찾았어요.
            </p>
            {result.warnings.map((w) => (
              <p key={w} className="notice notice-warn">
                {w}
              </p>
            ))}
          </section>

          <div className="transport">
            {playing ? (
              <button type="button" className="primary" onClick={stop}>
                정지
              </button>
            ) : (
              <button type="button" className="primary" onClick={() => play(volumes)}>
                전체 듣기
              </button>
            )}
            <label>
              빠르기
              <select value={tempoRatio} onChange={(e) => setTempoRatio(Number(e.target.value))}>
                <option value={0.5}>아주 느리게 (50%)</option>
                <option value={0.75}>느리게 (75%)</option>
                <option value={1}>원래 빠르기</option>
              </select>
            </label>
          </div>

          <PartList
            parts={result.model.parts}
            roles={roles}
            volumes={volumes}
            onRoleChange={(id, role) => setRoles({ ...roles, [id]: role })}
            onVolumeChange={(id, v) => setVolumes({ ...volumes, [id]: v })}
            onSolo={solo}
          />

          <ScoreView xml={result.xml} />
        </>
      )}
    </>
  );
}
