import Link from "next/link";
import type { Rehearsal } from "@/schedule/calendar";

const VOICES = ["soprano", "alto", "tenor", "bass"];

export type HomeLinks = { group: string; personal: string; videos: string; homework: string; calendar: string };

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** "11월 8일 (일)" */
export function shortDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return `${m}월 ${d}일 (${WEEKDAYS[new Date(y, m - 1, d).getDay()]})`;
}

/**
 * The first screen: the next rehearsal up top (it opens the calendar),
 * then four wide cards stacked top to bottom.
 */
export function HomeMenu({ links, next }: { links: HomeLinks; next?: Rehearsal }) {
  const items = [
    {
      href: links.group,
      name: "단체연습",
      desc: "악보 전체를 펼쳐 놓고 다 함께 불러요",
      mark: (
        <span className="menu-motif">
          {VOICES.map((v) => (
            <i key={v} className={`part-${v}`} />
          ))}
        </span>
      ),
    },
    {
      href: links.personal,
      name: "개인연습",
      desc: "곡을 고르고 내 파트를 혼자 익혀요",
      mark: (
        <span className="menu-motif">
          <i className="part-alto" />
        </span>
      ),
    },
    { href: links.videos, name: "공연 영상", desc: "우리 합창단 공연을 다시 봐요", mark: <span className="menu-icon menu-icon-play" /> },
    { href: links.homework, name: "숙제", desc: "이번 주 연습할 것", mark: <span className="menu-icon menu-icon-check" /> },
  ];

  return (
    <>
      <Link href={links.calendar} className="next-card">
        {next ? (
          <>
            <span className="next-when">
              {shortDay(next.date)}
              {next.time && ` · ${next.time}`}
            </span>
            <span className="next-title">{next.title}</span>
            <span className="next-songs">
              {next.songs.length > 0 ? next.songs.map((s) => s.title).join(", ") : "곡은 아직 정하지 않았어요"}
            </span>
          </>
        ) : (
          <>
            <span className="next-when">다음 연습</span>
            <span className="next-title">잡힌 일정이 없어요</span>
          </>
        )}
        <span className="next-go">연습 일정 보기</span>
      </Link>

      <nav className="home-menu" aria-label="메뉴">
        {items.map((item) => (
          <Link key={item.name} href={item.href} className="menu-tile">
            <span className="menu-mark" aria-hidden="true">
              {item.mark}
            </span>
            <span className="menu-name">{item.name}</span>
            <span className="menu-desc">{item.desc}</span>
            <span className="menu-go" aria-hidden="true">
              ›
            </span>
          </Link>
        ))}
      </nav>
    </>
  );
}
