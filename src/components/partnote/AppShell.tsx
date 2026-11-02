"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { uiScale } from "@/ui/scale";
import { CalendarIcon, HomeIcon, PeopleIcon, ScoreIcon } from "./icons";

export type TabId = "home" | "score" | "schedule" | "members";
export type TabLinks = Record<TabId, string>;

const TABS: { id: TabId; label: string; icon: () => React.ReactNode }[] = [
  { id: "home", label: "홈", icon: HomeIcon },
  { id: "score", label: "악보", icon: ScoreIcon },
  { id: "schedule", label: "일정", icon: CalendarIcon },
  { id: "members", label: "단원", icon: PeopleIcon },
];

function subscribe(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

/** The phone design, enlarged as a whole on tablets, with the four tabs along the bottom. */
export function AppShell({ tab, links, children }: { tab: TabId; links: TabLinks; children: React.ReactNode }) {
  const scale = useSyncExternalStore(
    subscribe,
    () => uiScale(window.innerWidth, window.innerHeight),
    () => 1,
  );
  return (
    <div className="app" style={{ "--ui-scale": scale } as React.CSSProperties}>
      <div className="app-main">{children}</div>
      <nav className="tabbar" aria-label="메뉴">
        {TABS.map(({ id, label, icon: TabIcon }) => (
          <Link key={id} href={links[id]} className="tab" aria-current={id === tab ? "page" : undefined}>
            <TabIcon />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

/** The split buttons at the top of a tab (전체연습 / 개인연습 / 파트별 과제 …). */
export function Segments<T extends string>({
  items,
  current,
  href,
}: {
  items: { id: T; label: string }[];
  current: T;
  href: (id: T) => string;
}) {
  return (
    <nav className="segments" aria-label="구분">
      {items.map((s) => (
        <Link key={s.id} href={href(s.id)} className="segment" aria-current={s.id === current ? "page" : undefined}>
          {s.label}
        </Link>
      ))}
    </nav>
  );
}

/** A thin 2px bar for progress and attendance. */
export function Bar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <span className="bar" role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${pct}%` }} />
    </span>
  );
}

/** What a list shows before there is anything in it. */
export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {children && <p className="empty-text">{children}</p>}
    </div>
  );
}
