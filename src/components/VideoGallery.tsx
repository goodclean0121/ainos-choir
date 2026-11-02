"use client";

import Link from "next/link";
import { useState } from "react";
import type { Video } from "@/videos/drive";

function shortDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}

/** Performance videos, newest first. They come from the choir's shared Drive folder. */
export function VideoGallery({ videos, backHref }: { videos: Video[]; backHref: string }) {
  const [playing, setPlaying] = useState<Video>();

  return (
    <div className="videos">
      <div className="list-head">
        <Link href={backHref} className="back-circle" aria-label="처음 화면으로">
          <span aria-hidden="true">←</span>
        </Link>
        <div>
          <span className="mode-label">함께 보기</span>
          <h1>공연 영상</h1>
        </div>
      </div>

      {playing && (
        <section className="video-player" aria-label={playing.title}>
          <iframe src={playing.embedUrl} title={playing.title} allow="autoplay; fullscreen" allowFullScreen />
          <div className="video-player-bar">
            <h2>{playing.title}</h2>
            <button type="button" onClick={() => setPlaying(undefined)}>
              닫기
            </button>
          </div>
        </section>
      )}

      {videos.length === 0 ? (
        <section className="video-empty">
          <span className="video-empty-mark" aria-hidden="true" />
          <h2>아직 올라온 영상이 없어요</h2>
          <p>합창단 공유 드라이브의 「공연 영상」 폴더에 영상을 올리면, 이 화면에 저절로 나타나요.</p>
          <ol className="video-steps">
            <li>관리자가 드라이브 폴더를 한 번 연결해요</li>
            <li>누구든 그 폴더에 공연 영상을 올려요</li>
            <li>새로고침하면 맨 위에 새 영상이 보여요</li>
          </ol>
        </section>
      ) : (
        <ul className="video-grid">
          {videos.map((v) => (
            <li key={v.id}>
              <button type="button" className="video-card" onClick={() => setPlaying(v)}>
                <span className="video-thumb">
                  {v.thumbnail && <img src={v.thumbnail} alt="" loading="lazy" />}
                  {v.duration && <span className="video-duration">{v.duration}</span>}
                </span>
                <span className="video-title">{v.title}</span>
                <span className="video-date">{shortDate(v.date)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
