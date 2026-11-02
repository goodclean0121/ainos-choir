"use client";

import Link from "next/link";
import { GOAL_TICKS_KEY } from "./ScoreScreen";
import { songProgress, weekOf } from "@/practice/goals";
import { useTicks } from "@/practice/local";
import { type Rehearsal, type RehearsalSong } from "@/schedule/calendar";
import { Bar, Empty, Segments } from "./AppShell";
import { longDay } from "./HomeScreen";

export type ScheduleSegment = "wednesday" | "sunday";
const SEGMENTS: { id: ScheduleSegment; label: string }[] = [
  { id: "wednesday", label: "수요일 연습곡" },
  { id: "sunday", label: "일요일 공연곡" },
];
const MEMORISED_KEY = "partnote:memorised";

export function ScheduleScreen({
  segment,
  segmentHref,
  today,
  practices,
  performance,
  scoreHref,
  calendarHref,
  videosHref,
}: {
  segment: ScheduleSegment;
  segmentHref: (s: ScheduleSegment) => string;
  today: string;
  /** Upcoming practices, soonest first. */
  practices: Rehearsal[];
  performance?: Rehearsal;
  scoreHref: (song: RehearsalSong) => string | undefined;
  calendarHref: string;
  videosHref: string;
}) {
  return (
    <div className="screen">
      <header className="screen-head">
        <h1>일정</h1>
      </header>
      <Segments items={SEGMENTS} current={segment} href={segmentHref} />
      {segment === "wednesday" ? (
        <PracticePanel today={today} practices={practices} scoreHref={scoreHref} />
      ) : (
        <PerformancePanel performance={performance} scoreHref={scoreHref} videosHref={videosHref} />
      )}
      <Link href={calendarHref} className="pill pill-outline wide">
        달력에서 지난 일정과 다음 일정 보기
      </Link>
    </div>
  );
}

function PracticePanel({
  today,
  practices,
  scoreHref,
}: {
  today: string;
  practices: Rehearsal[];
  scoreHref: (song: RehearsalSong) => string | undefined;
}) {
  const [ticks] = useTicks(GOAL_TICKS_KEY);
  const [next, after] = practices;
  if (!next) return <Empty title="잡힌 연습이 없어요" />;
  const week = weekOf(today);
  return (
    <>
      <div className="card info-card">
        <span className="card-sub">다음 연습</span>
        <span className="card-title">{next.title}</span>
        <span className="card-sub">{[longDay(next.date), next.time, next.place].filter(Boolean).join(" · ")}</span>
      </div>
      <section>
        <h2 className="section-title">연습곡</h2>
        {next.songs.length === 0 ? (
          <Empty title="연습곡이 아직 정해지지 않았어요" />
        ) : (
          <ul className="card-list">
            {next.songs.map((s, i) => {
              const href = scoreHref(s);
              return (
                <li key={`${s.title}-${i}`} className="card song-row">
                  <span className="song-row-text">
                    <span className="card-title">{s.title}</span>
                    {s.note && <span className="card-sub">{s.note}</span>}
                    <Bar value={songProgress(ticks, week, s.title)} label={`${s.title} 내 진도`} />
                  </span>
                  {href && (
                    <Link href={href} className="pill pill-small">
                      악보
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {after && (
        <section>
          <h2 className="section-title">다음 수요일 예정곡</h2>
          <div className="card info-card">
            <span className="card-sub">{longDay(after.date)}</span>
            <span className="card-title">
              {after.songs.length > 0 ? after.songs.map((s) => s.title).join(", ") : "아직 정하지 않았어요"}
            </span>
          </div>
        </section>
      )}
    </>
  );
}

function PerformancePanel({
  performance,
  scoreHref,
  videosHref,
}: {
  performance?: Rehearsal;
  scoreHref: (song: RehearsalSong) => string | undefined;
  videosHref: string;
}) {
  const [memorised, toggle] = useTicks(MEMORISED_KEY);
  return (
    <>
      {performance ? (
        <>
          <div className="perf-card perf-static">
            <span className="perf-when">
              {longDay(performance.date)}
              {performance.time && ` · ${performance.time}`}
            </span>
            <span className="perf-name">{performance.title}</span>
            {performance.place && <span className="perf-place">{performance.place}</span>}
          </div>
          <section>
            <h2 className="section-title">공연 곡 순서</h2>
            {performance.songs.length === 0 ? (
              <Empty title="공연 곡이 아직 정해지지 않았어요" />
            ) : (
              <ol className="card-list">
                {performance.songs.map((s, i) => {
                  const id = `${performance.date}|${s.title}`;
                  const href = scoreHref(s);
                  return (
                    <li key={id} className="card song-row">
                      <span className="order-no">{i + 1}</span>
                      <span className="song-row-text">
                        {href ? (
                          <Link href={href} className="card-title">
                            {s.title}
                          </Link>
                        ) : (
                          <span className="card-title">{s.title}</span>
                        )}
                        {s.note && <span className="card-sub">{s.note}</span>}
                      </span>
                      <label className="toggle">
                        <span>암보 체크</span>
                        <input type="checkbox" role="switch" checked={memorised.has(id)} onChange={() => toggle(id)} />
                        <span className="toggle-track" aria-hidden="true" />
                      </label>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
          <section>
            <h2 className="section-title">복장과 집합 안내</h2>
            <div className="card info-card">
              <span className="info-line">
                <span className="card-sub">복장</span>
                {performance.dress ?? "아직 안내가 없어요"}
              </span>
              <span className="info-line">
                <span className="card-sub">집합</span>
                {performance.gather ?? "아직 안내가 없어요"}
              </span>
            </div>
          </section>
        </>
      ) : (
        <Empty title="다가오는 공연이 없어요" />
      )}
      <Link href={videosHref} className="card row-link">
        <span className="card-title">지난 공연 영상</span>
        <span className="card-sub">드라이브 폴더에 올린 공연을 다시 봐요</span>
      </Link>
    </>
  );
}
