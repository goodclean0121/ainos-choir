"use client";

import Link from "next/link";
import { useState } from "react";
import { matchesTitle } from "@/components/GroupPractice";
import { GOALS, goalId, weekOf } from "@/practice/goals";
import { useStored, useTicks } from "@/practice/local";
import { weekSeconds, type PracticeLog } from "@/practice/time";
import { Bar, Empty, Segments } from "./AppShell";
import { MicIcon, PlayIcon } from "./icons";

export type ScoreSegment = "group" | "personal" | "tasks";
const SEGMENTS: { id: ScoreSegment; label: string }[] = [
  { id: "group", label: "전체연습" },
  { id: "personal", label: "개인연습" },
  { id: "tasks", label: "파트별 과제" },
];
const PARTS = [
  { id: "soprano", label: "소프라노" },
  { id: "alto", label: "알토" },
  { id: "tenor", label: "테너" },
  { id: "bass", label: "베이스" },
];
const WEEK_GOAL_MINUTES = 120;

/** A PDF score for group practice, with where it opens and (when there is one) its sounding score. */
export type ScoreCard = { id: string; title: string; openHref: string; listenHref?: string; memos: number; inThisPractice: boolean };
/** A score personal practice can play part by part. */
export type PlayableSong = { id: string; title: string; href: string };

export const PRACTICE_LOG_KEY = "partnote:practice-seconds";
export const GOAL_TICKS_KEY = "partnote:goals";

export function ScoreScreen({
  segment,
  segmentHref,
  today,
  scores,
  weekSongs,
  playable,
  onAddScore,
  onOpenFile,
}: {
  segment: ScoreSegment;
  segmentHref: (s: ScoreSegment) => string;
  today: string;
  scores: ScoreCard[];
  /** Titles of the songs this week's practices use: their goals fill personal practice. */
  weekSongs: string[];
  playable: PlayableSong[];
  /** Adds a PDF score (admins); no button without it. */
  onAddScore?: (file: File) => void;
  /** Opens a MusicXML file from this device for personal practice. */
  onOpenFile?: (file: File) => void;
}) {
  return (
    <div className="screen">
      <header className="screen-head">
        <h1>악보</h1>
      </header>
      <Segments items={SEGMENTS} current={segment} href={segmentHref} />
      {segment === "group" && <GroupPanel scores={scores} onAddScore={onAddScore} />}
      {segment === "personal" && (
        <PersonalPanel today={today} weekSongs={weekSongs} playable={playable} onOpenFile={onOpenFile} />
      )}
      {segment === "tasks" && <TasksPanel />}
    </div>
  );
}

function GroupPanel({ scores, onAddScore }: { scores: ScoreCard[]; onAddScore?: (file: File) => void }) {
  const [query, setQuery] = useState("");
  const found = scores.filter((s) => matchesTitle(s.title, query));
  const now = found.filter((s) => s.inThisPractice);
  const rest = found.filter((s) => !s.inThisPractice);

  const card = (s: ScoreCard) => (
    <li key={s.id} className="card score-card-item">
      <span className="card-title">{s.title}</span>
      <span className="card-actions">
        <Link href={s.openHref} className="pill pill-primary">
          악보 열기
        </Link>
        {s.listenHref ? (
          <Link href={s.listenHref} className="pill">
            <PlayIcon />
            음원 듣기
          </Link>
        ) : (
          <span className="pill pill-off" aria-disabled="true">
            음원 없음
          </span>
        )}
        <span className="memo-count">지휘자 메모 {s.memos}</span>
      </span>
    </li>
  );

  return (
    <>
      <input
        type="search"
        className="search"
        placeholder="곡 이름으로 찾기"
        aria-label="곡 찾기"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {now.length > 0 && (
        <section>
          <h2 className="section-title">이번 연습 범위</h2>
          <ul className="card-list">{now.map(card)}</ul>
        </section>
      )}
      <section>
        <h2 className="section-title">{now.length > 0 ? "다른 곡" : "모든 곡"}</h2>
        {rest.length > 0 ? <ul className="card-list">{rest.map(card)}</ul> : <Empty title={query ? `‘${query}’ 곡을 찾지 못했어요` : "다른 곡이 없어요"} />}
      </section>
      {onAddScore && (
        <label className="pill pill-outline add-score">
          곡 추가 (PDF)
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onAddScore(file);
              e.target.value = "";
            }}
          />
        </label>
      )}
    </>
  );
}

function PersonalPanel({
  today,
  weekSongs,
  playable,
  onOpenFile,
}: {
  today: string;
  weekSongs: string[];
  playable: PlayableSong[];
  onOpenFile?: (file: File) => void;
}) {
  const week = weekOf(today);
  const [ticks, toggle] = useTicks(GOAL_TICKS_KEY);
  const [log] = useStored<PracticeLog>(PRACTICE_LOG_KEY, {});
  const minutes = Math.round(weekSeconds(log, today) / 60);

  return (
    <>
      <section>
        <h2 className="section-title">오늘의 연습 목표</h2>
        {weekSongs.length === 0 ? (
          <Empty title="이번 주 연습곡이 정해지면 목표가 생겨요" />
        ) : (
          <ul className="checklist card">
            {weekSongs.flatMap((song) =>
              GOALS.map((g) => {
                const id = goalId(week, song, g.id);
                return (
                  <li key={id}>
                    <label className="check">
                      <input type="checkbox" checked={ticks.has(id)} onChange={() => toggle(id)} />
                      <span className="check-box" aria-hidden="true" />
                      <span>
                        <span className="check-label">{g.label}</span>
                        <span className="card-sub">{song}</span>
                      </span>
                    </label>
                  </li>
                );
              }),
            )}
          </ul>
        )}
      </section>

      <section>
        <h2 className="section-title">이번 주 연습 시간</h2>
        <div className="card time-card">
          <span className="time-value">
            {minutes}분 <span className="card-sub">/ 목표 {WEEK_GOAL_MINUTES}분</span>
          </span>
          <Bar value={minutes / WEEK_GOAL_MINUTES} label="이번 주 연습 시간" />
          <span className="card-sub">연습 모드에서 연습한 시간이 이 기기에 쌓여요.</span>
        </div>
      </section>

      <section>
        <h2 className="section-title">내 파트 연습하기</h2>
        <ul className="card-list">
          {playable.map((p) => (
            <li key={p.id}>
              <Link href={p.href} className="card row-link">
                <span className="card-title">{p.title}</span>
                <span className="pill pill-primary pill-small">연습 모드</span>
              </Link>
            </li>
          ))}
        </ul>
        {onOpenFile && (
          <label className="text-link file-link">
            내 기기의 악보 열기 (MusicXML)
            <input
              type="file"
              accept=".musicxml,.xml,.mxl"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onOpenFile(file);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </section>

      <button type="button" className="pill pill-outline record" disabled>
        <MicIcon />
        녹음해서 제출하기
        <span className="soon">준비 중</span>
      </button>
    </>
  );
}

function TasksPanel() {
  const [part, setPart] = useState(PARTS[0].id);
  return (
    <>
      <div className="chips" role="group" aria-label="파트">
        {PARTS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`chip part-${p.id}`}
            aria-pressed={p.id === part}
            onClick={() => setPart(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <Empty title={`${PARTS.find((p) => p.id === part)!.label} 과제가 아직 없어요`}>
        지휘자나 파트장이 과제를 내면 마디 위치, 마감일, 제출 상태(미제출, 진행 중, 제출 완료)가 여기에 보여요.
      </Empty>
    </>
  );
}
