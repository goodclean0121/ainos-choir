import Link from "next/link";

const VOICES = ["soprano", "alto", "tenor", "bass"];

export type HomeLinks = { group: string; personal: string; videos: string; homework: string };

/** The first screen: the two ways to practise up top, then videos and homework. */
export function HomeMenu({ links }: { links: HomeLinks }) {
  return (
    <nav className="home-menu" aria-label="메뉴">
      <Link href={links.group} className="menu-tile menu-group">
        <span className="menu-motif" aria-hidden="true">
          {VOICES.map((v) => (
            <i key={v} className={`part-${v}`} />
          ))}
        </span>
        <span className="menu-name">단체연습</span>
        <span className="menu-desc">악보 전체를 펼쳐 놓고 다 함께 불러요</span>
        <span className="menu-go">악보 펼치기</span>
      </Link>

      <Link href={links.personal} className="menu-tile menu-personal">
        <span className="menu-motif" aria-hidden="true">
          <i className="part-alto" />
        </span>
        <span className="menu-name">개인연습</span>
        <span className="menu-desc">곡을 고르고 내 파트를 혼자 익혀요</span>
        <span className="menu-go">곡 고르기</span>
      </Link>

      <Link href={links.videos} className="menu-tile menu-small menu-videos">
        <span className="menu-icon menu-icon-play" aria-hidden="true" />
        <span className="menu-name">공연 영상</span>
        <span className="menu-desc">우리 찬양대 공연을 다시 봐요</span>
      </Link>

      <Link href={links.homework} className="menu-tile menu-small menu-homework">
        <span className="menu-icon menu-icon-check" aria-hidden="true" />
        <span className="menu-name">숙제</span>
        <span className="menu-desc">이번 주 연습할 것</span>
      </Link>
    </nav>
  );
}
