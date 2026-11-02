"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PdfScoreView } from "@/components/PdfScoreView";

export type PdfScore = { id: string; title: string; src: string };

/** Group practice: the whole score as printed, with the song list tucked behind a button. */
export function GroupPractice({ scores, backHref }: { scores: PdfScore[]; backHref: string }) {
  const [current, setCurrent] = useState(scores[0]);
  const [listOpen, setListOpen] = useState(false);
  const listButton = useRef<HTMLButtonElement>(null);
  const firstItem = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!listOpen) return;
    firstItem.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [listOpen]);

  function close() {
    setListOpen(false);
    listButton.current?.focus();
  }

  if (!current) return <p className="hint">아직 올라온 악보가 없어요.</p>;

  return (
    <div className="group-practice">
      <header className="group-head">
        <Link href={backHref} className="back-circle" aria-label="처음 화면으로">
          <span aria-hidden="true">←</span>
        </Link>
        <button
          ref={listButton}
          type="button"
          className="list-toggle"
          aria-expanded={listOpen}
          aria-controls="score-list"
          onClick={() => setListOpen((v) => !v)}
        >
          <span className="list-icon" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          곡 목록
        </button>
        <div className="practice-title">
          <span className="mode-label">단체연습</span>
          <h1>{current.title}</h1>
        </div>
      </header>

      <div className="score-card pdf-card">
        <PdfScoreView key={current.id} src={current.src} title={current.title} />
      </div>

      {listOpen && <div className="drawer-scrim" onClick={close} aria-hidden="true" />}
      <nav id="score-list" className="score-drawer" aria-label="곡 목록" hidden={!listOpen}>
        <p className="drawer-title">곡 목록</p>
        <ul>
          {scores.map((s, i) => (
            <li key={s.id}>
              <button
                ref={i === 0 ? firstItem : undefined}
                type="button"
                aria-current={s.id === current.id ? "true" : undefined}
                onClick={() => {
                  setCurrent(s);
                  close();
                }}
              >
                {s.title}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
