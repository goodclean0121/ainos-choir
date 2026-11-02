"use client";

import Link from "next/link";
import { useState } from "react";
import { shortDay } from "@/components/HomeMenu";
import { dayKey, monthGrid, nextRehearsal, type Rehearsal, type RehearsalSong } from "@/schedule/calendar";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** A month calendar of rehearsals; the songs for the chosen day are listed under it. */
export function RehearsalCalendar({
  rehearsals,
  backHref,
  scoreHref,
  today = dayKey(new Date()),
  notice,
}: {
  rehearsals: Rehearsal[];
  backHref: string;
  scoreHref: (song: RehearsalSong) => string | undefined;
  today?: string;
  notice?: string;
}) {
  const start = nextRehearsal(rehearsals, today)?.date ?? today;
  const [selected, setSelected] = useState(start);
  const [view, setView] = useState(() => {
    const [y, m] = start.split("-").map(Number);
    return { year: y, month: m - 1 };
  });
  const byDay = new Map(rehearsals.map((r) => [r.date, r]));
  const chosen = byDay.get(selected);

  function shift(delta: number) {
    const d = new Date(view.year, view.month + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  }

  return (
    <div className="calendar-page">
      <div className="list-head">
        <Link href={backHref} className="back-circle" aria-label="처음 화면으로">
          <span aria-hidden="true">←</span>
        </Link>
        <div>
          <span className="mode-label">캘린더</span>
          <h1>연습 일정</h1>
        </div>
      </div>

      <div className="calendar-layout">
        <section className="calendar-card" aria-label={`${view.year}년 ${view.month + 1}월`}>
          <div className="calendar-nav">
            <button type="button" aria-label="이전 달" onClick={() => shift(-1)}>
              ‹
            </button>
            <h2>
              {view.year}년 {view.month + 1}월
            </h2>
            <button type="button" aria-label="다음 달" onClick={() => shift(1)}>
              ›
            </button>
          </div>
          <div className="calendar-grid" role="grid">
            <div role="row" className="calendar-week calendar-weekdays">
              {WEEKDAYS.map((w, i) => (
                <span key={w} role="columnheader" className={i === 0 ? "is-sunday" : undefined}>
                  {w}
                </span>
              ))}
            </div>
            {monthGrid(view.year, view.month).map((week) => (
              <div role="row" className="calendar-week" key={week[0].key}>
                {week.map((d, i) => {
                  const has = byDay.has(d.key);
                  const classes = [
                    "calendar-day",
                    d.inMonth ? "" : "is-outside",
                    i === 0 ? "is-sunday" : "",
                    d.key === today ? "is-today" : "",
                    has ? "has-rehearsal" : "",
                  ].join(" ");
                  return (
                    <button
                      key={d.key}
                      type="button"
                      role="gridcell"
                      className={classes}
                      aria-selected={d.key === selected}
                      aria-label={`${shortDay(d.key)}${has ? ", 연습 있음" : ""}`}
                      onClick={() => setSelected(d.key)}
                    >
                      {d.day}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        <section className="day-songs" aria-live="polite">
          <p className="day-date">{shortDay(selected)}</p>
          {chosen ? (
            <>
              <h2>
                {chosen.title}
                {chosen.time && <span className="day-time">{chosen.time}</span>}
              </h2>
              {chosen.songs.length === 0 ? (
                <p className="day-empty">부를 곡은 아직 정하지 않았어요.</p>
              ) : (
                <ol className="song-rows">
                  {chosen.songs.map((s, i) => {
                    const href = scoreHref(s);
                    return (
                      <li key={`${s.title}-${i}`}>
                        <span className="song-order">{i + 1}</span>
                        <span className="song-text">
                          <span className="song-title">{s.title}</span>
                          {s.note && <span className="song-note">{s.note}</span>}
                        </span>
                        {href && (
                          <Link href={href} className="song-open">
                            악보
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </>
          ) : (
            <p className="day-empty">이날은 연습이 없어요. 점이 찍힌 날을 눌러 보세요.</p>
          )}
          {notice && <p className="day-notice">{notice}</p>}
        </section>
      </div>
    </div>
  );
}
