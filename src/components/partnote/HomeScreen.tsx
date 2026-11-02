import Link from "next/link";
import { dDay, type Rehearsal } from "@/schedule/calendar";
import { Bar, Empty } from "./AppShell";
import { ChevronIcon, PersonIcon } from "./icons";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function parts(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return { month: m, day: d, weekday: WEEKDAYS[new Date(y, m - 1, d).getDay()] };
}

export function longDay(key: string): string {
  const { month, day, weekday } = parts(key);
  return `${month}월 ${day}일 (${weekday})`;
}

export type WeekSong = { title: string; detail?: string; progress: number; href: string };

/** Home: the choir, this week's performance, the next two practices, and this week's songs. */
export function HomeScreen({
  choirName,
  initials,
  today,
  performance,
  practices,
  weekSongs,
  scheduleHref,
  practiceHref,
}: {
  choirName: string;
  initials?: string;
  today: string;
  performance?: Rehearsal;
  practices: Rehearsal[];
  weekSongs: WeekSong[];
  scheduleHref: string;
  practiceHref: string;
}) {
  return (
    <div className="screen">
      <header className="screen-head home-head">
        <h1>{choirName}</h1>
        <span className="initials" aria-label={initials ? `내 이름 ${initials}` : "로그인 전"}>
          {initials ?? <PersonIcon />}
        </span>
      </header>

      <section aria-labelledby="perf-title">
        <h2 id="perf-title" className="section-title">
          이번 주 공연
        </h2>
        {performance ? (
          <Link href={scheduleHref} className="perf-card">
            <span className="perf-when">
              {longDay(performance.date)}
              {performance.time && ` · ${performance.time}`}
            </span>
            <span className="perf-name">{performance.title}</span>
            {performance.place && <span className="perf-place">{performance.place}</span>}
            {performance.songs.length > 0 && (
              <ol className="perf-songs">
                {performance.songs.slice(0, 3).map((s, i) => (
                  <li key={`${s.title}-${i}`}>
                    <span className="perf-no">{i + 1}</span>
                    {s.title}
                  </li>
                ))}
              </ol>
            )}
          </Link>
        ) : (
          <Empty title="이번 주에는 공연이 없어요" />
        )}
      </section>

      <section aria-labelledby="practice-title">
        <h2 id="practice-title" className="section-title">
          연습 일정
        </h2>
        {practices.length === 0 ? (
          <Empty title="잡힌 연습이 없어요" />
        ) : (
          <ul className="card-list">
            {practices.slice(0, 2).map((p) => {
              const { day, weekday } = parts(p.date);
              return (
                <li key={p.date}>
                  <Link href={scheduleHref} className="card event-card">
                    <span className="date-box">
                      <span className="date-day">{day}</span>
                      <span className="date-weekday">{weekday}</span>
                    </span>
                    <span className="event-text">
                      <span className="card-title">{p.title}</span>
                      <span className="card-sub">{[p.time, p.place].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="dday">{dDay(p.date, today)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="songs-title">
        <h2 id="songs-title" className="section-title">
          이번 주 연습할 곡
        </h2>
        {weekSongs.length === 0 ? (
          <Empty title="이번 주 연습곡이 아직 없어요" />
        ) : (
          <ul className="card-list">
            {weekSongs.slice(0, 2).map((s) => (
              <li key={s.title}>
                <Link href={s.href} className="card song-card">
                  <span className="song-card-text">
                    <span className="card-title">{s.title}</span>
                    {s.detail && <span className="card-sub">{s.detail}</span>}
                    <Bar value={s.progress} label={`${s.title} 이번 주 진도`} />
                  </span>
                  <ChevronIcon />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link href={practiceHref} className="text-link">
          내 연습 목표 보기
        </Link>
      </section>
    </div>
  );
}
