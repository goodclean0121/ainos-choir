import Link from "next/link";

const VOICES = ["soprano", "alto", "tenor", "bass"];

export type HomeLinks = { group: string; personal: string; videos: string; homework: string };

/** The first screen: four wide cards stacked top to bottom. */
export function HomeMenu({ links }: { links: HomeLinks }) {
  return (
    <nav className="home-menu" aria-label="메뉴">
      <Link href={links.group} className="menu-tile menu-group">
        <span className="menu-mark menu-motif" aria-hidden="true">
          {VOICES.map((v) => (
            <i key={v} className={`part-${v}`} />
          ))}
        </span>
        <span className="menu-name">단체연습</span>
        <span className="menu-desc">악보 전체를 펼쳐 놓고 다 함께 불러요</span>
        <span className="menu-go" aria-hidden="true">›</span>
      </Link>

      <Link href={links.personal} className="menu-tile menu-personal">
        <span className="menu-mark menu-motif" aria-hidden="true">
          <i className="part-alto" />
        </span>
        <span className="menu-name">개인연습</span>
        <span className="menu-desc">곡을 고르고 내 파트를 혼자 익혀요</span>
        <span className="menu-go" aria-hidden="true">›</span>
      </Link>

      <Link href={links.videos} className="menu-tile menu-videos">
        <span className="menu-mark" aria-hidden="true">
          <span className="menu-icon menu-icon-play" />
        </span>
        <span className="menu-name">공연 영상</span>
        <span className="menu-desc">우리 찬양대 공연을 다시 봐요</span>
        <span className="menu-go" aria-hidden="true">›</span>
      </Link>

      <Link href={links.homework} className="menu-tile menu-homework">
        <span className="menu-mark" aria-hidden="true">
          <span className="menu-icon menu-icon-check" />
        </span>
        <span className="menu-name">숙제</span>
        <span className="menu-desc">이번 주 연습할 것</span>
        <span className="menu-go" aria-hidden="true">›</span>
      </Link>
    </nav>
  );
}
