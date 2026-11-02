"use client";

import Link from "next/link";
import { useState } from "react";
import { Empty, Segments } from "./AppShell";

export type MembersSegment = "notices" | "people" | "votes";
const SEGMENTS: { id: MembersSegment; label: string }[] = [
  { id: "notices", label: "공지" },
  { id: "people", label: "단원" },
  { id: "votes", label: "투표" },
];
const PARTS = [
  { id: "soprano", label: "소프라노" },
  { id: "alto", label: "알토" },
  { id: "tenor", label: "테너" },
  { id: "bass", label: "베이스" },
];

/** Notices, the member list and votes. Nothing is stored for these yet, so each shows what will come. */
export function MembersScreen({
  segment,
  segmentHref,
  adminHref,
}: {
  segment: MembersSegment;
  segmentHref: (s: MembersSegment) => string;
  /** Shown only to admins. */
  adminHref?: string;
}) {
  const [part, setPart] = useState(PARTS[0].id);
  return (
    <div className="screen">
      <header className="screen-head">
        <h1>단원</h1>
        {adminHref && (
          <Link href={adminHref} className="pill pill-outline pill-small">
            관리
          </Link>
        )}
      </header>
      <Segments items={SEGMENTS} current={segment} href={segmentHref} />
      {segment === "notices" && (
        <Empty title="아직 공지가 없어요">공지가 올라오면 고정 공지가 맨 위에 보이고, 읽은 공지에 「확인했어요」를 누를 수 있어요.</Empty>
      )}
      {segment === "people" && (
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
          <Empty title={`${PARTS.find((p) => p.id === part)!.label} 명단이 아직 없어요`}>
            단원 명단이 들어오면 파트장 표시, 출석률, 파트장 연락 버튼이 여기에 보여요.
          </Empty>
        </>
      )}
      {segment === "votes" && (
        <Empty title="진행 중인 투표가 없어요">투표가 열리면 선택지마다 인원수가 막대로 보이고, 한 번 더 누르면 취소돼요.</Empty>
      )}
    </div>
  );
}
