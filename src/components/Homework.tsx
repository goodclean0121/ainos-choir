import Link from "next/link";

/** A place kept for homework; what it holds comes later. */
export function Homework({ backHref }: { backHref: string }) {
  return (
    <div className="homework">
      <div className="list-head">
        <Link href={backHref} className="back-circle" aria-label="처음 화면으로">
          <span aria-hidden="true">←</span>
        </Link>
        <div>
          <span className="mode-label">이번 주</span>
          <h1>숙제</h1>
        </div>
      </div>
      <section className="homework-empty">
        <span className="homework-mark" aria-hidden="true" />
        <h2>아직 낸 숙제가 없어요</h2>
        <p>지휘자가 숙제를 내면 여기에서 확인하고, 다 한 숙제에 표시할 수 있어요.</p>
      </section>
    </div>
  );
}
