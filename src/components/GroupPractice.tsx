"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PdfScoreView } from "@/components/PdfScoreView";

export type PdfScore = { id: string; title: string; src: string };

/** Spaces and case don't matter when looking a song up. */
export function matchesTitle(title: string, query: string): boolean {
  const norm = (t: string) => t.toLowerCase().replace(/\s+/g, "");
  return norm(title).includes(norm(query));
}

/**
 * Group practice: the whole score as printed, with the song list tucked behind a button.
 * `onAdd` turns a chosen PDF into a new score; without it there is no add button.
 */
export function GroupPractice({
  scores,
  backHref,
  onAdd,
  initialId,
}: {
  scores: PdfScore[];
  backHref: string;
  onAdd?: (file: File) => Promise<PdfScore>;
  initialId?: string;
}) {
  const [current, setCurrent] = useState(scores.find((s) => s.id === initialId) ?? scores[0]);
  const [listOpen, setListOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [addError, setAddError] = useState<string>();
  const found = scores.filter((s) => matchesTitle(s.title, query));
  const listButton = useRef<HTMLButtonElement>(null);
  const searchBox = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!listOpen) return;
    searchBox.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [listOpen]);

  async function add(file: File) {
    if (!onAdd) return;
    setAddError(undefined);
    try {
      const score = await onAdd(file);
      setCurrent(score);
      setQuery("");
      close();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "악보를 추가하지 못했어요");
    }
  }

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
        <div className="practice-title group-title">
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
        <input
          ref={searchBox}
          type="search"
          className="drawer-search"
          placeholder="곡 이름으로 찾기"
          aria-label="곡 찾기"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul>
          {found.map((s) => (
            <li key={s.id}>
              <button
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
        {found.length === 0 && <p className="drawer-empty">‘{query}’ 곡을 찾지 못했어요.</p>}
        {onAdd && (
          <label className="drawer-add">
            <span aria-hidden="true">+</span>
            곡 추가 (PDF)
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void add(file);
                e.target.value = "";
              }}
            />
          </label>
        )}
        {addError && <p className="notice notice-error">{addError}</p>}
      </nav>
    </div>
  );
}
