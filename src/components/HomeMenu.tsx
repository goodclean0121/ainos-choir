import Link from "next/link";

const VOICES = ["soprano", "alto", "tenor", "bass"];

/** The first screen: group practice, personal practice, and a slot kept for a later menu. */
export function HomeMenu({ personalHref }: { personalHref: string }) {
  return (
    <nav className="home-menu" aria-label="연습 고르기">
      <div className="menu-tile menu-group" aria-disabled="true">
        <span className="menu-motif" aria-hidden="true">
          {VOICES.map((v) => (
            <i key={v} className={`part-${v}`} />
          ))}
        </span>
        <span className="menu-name">단체연습</span>
        <span className="menu-desc">지휘에 맞춰 다 함께 불러요</span>
        <span className="menu-tag">준비 중</span>
      </div>

      <Link href={personalHref} className="menu-tile menu-personal">
        <span className="menu-motif" aria-hidden="true">
          <i className="part-alto" />
        </span>
        <span className="menu-name">개인연습</span>
        <span className="menu-desc">곡을 고르고 내 파트를 혼자 익혀요</span>
        <span className="menu-go">곡 고르기</span>
      </Link>

      <div className="menu-tile menu-empty" aria-label="비어 있는 메뉴 자리">
        <span className="menu-plus" aria-hidden="true">+</span>
        <span className="menu-desc">새 메뉴 자리</span>
      </div>
    </nav>
  );
}
