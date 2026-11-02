import { StrictMode, useEffect, useState } from "react";
import { HomeMenu } from "@/components/HomeMenu";
import { GroupPractice, type PdfScore } from "@/components/GroupPractice";
import { VideoGallery } from "@/components/VideoGallery";
import { Homework } from "@/components/Homework";
import { createRoot } from "react-dom/client";
import { Practice } from "@/app/songs/[id]/Practice";
import { importScore } from "@/score/importScore";
import type { Song } from "@/songs/loadSong";
import demoXml from "@/server/seed/practice-example.musicxml?raw";
import "@/app/globals.css";
import "./standalone.css";

const DEMO: Song = { title: "연습용 예제 (4성부 화음 연습)", xml: demoXml };

// Scores dropped into standalone/songs/ (kept out of git) are bundled into the trial too.
const BUNDLED = Object.entries(
  import.meta.glob<string>("./songs/*.musicxml", { query: "?raw", import: "default", eager: true }),
).map(([path, xml]) => {
  const title = /<work-title>([^<]+)<\/work-title>/.exec(xml)?.[1] ?? path.replace(/^.*\/|\.musicxml$/g, "");
  return { id: path, song: { title, xml } as Song };
});
const SONGS = [...BUNDLED, { id: "demo", song: DEMO }];

// PDF scores for group practice, from standalone/pdfs/ (also kept out of git). "1-Title.pdf" sorts first.
const PDFS: PdfScore[] = Object.entries(
  import.meta.glob<string>("./pdfs/*.pdf", { query: "?url", import: "default", eager: true }),
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, src]) => ({ id: path, title: path.replace(/^.*\/(\d+-)?|\.pdf$/g, ""), src }));

const VIEWS = ["home", "songs", "play", "group", "videos", "homework"] as const;
type View = (typeof VIEWS)[number];

function readView(): View {
  const hash = typeof location === "undefined" ? "" : location.hash.slice(1);
  return (VIEWS as readonly string[]).includes(hash) ? (hash as View) : "home";
}

/** A trial build of the app that runs from one file, with no server. The hash picks the screen. */
function App() {
  const [view, setView] = useState<View>(readView);
  const [song, setSong] = useState<{ id: string; song: Song }>(SONGS[0]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const onHash = () => setView(readView());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function play(next: { id: string; song: Song }) {
    setSong(next);
    window.location.assign("#play");
  }

  async function open(file: File) {
    setError(undefined);
    try {
      const imported = await importScore(file);
      play({
        id: `file-${file.name}-${file.lastModified}`,
        song: { title: file.name.replace(/\.[^.]+$/, ""), xml: imported.xml, roles: imported.roles },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "악보를 열지 못했어요");
    }
  }

  if (view === "play") {
    return (
      <main className="page page-practice">
        <Practice key={song.id} songId={song.id} song={song.song} backHref="#songs" />
      </main>
    );
  }

  if (view === "group") {
    return (
      <main className="page page-practice">
        <GroupPractice scores={PDFS} backHref="#" />
      </main>
    );
  }

  if (view === "videos") {
    return (
      <main className="page page-wide">
        <VideoGallery videos={[]} backHref="#" />
      </main>
    );
  }

  if (view === "homework") {
    return (
      <main className="page">
        <Homework backHref="#" />
      </main>
    );
  }

  if (view === "songs") {
    return (
      <main className="page">
        <div className="list-head">
          <a href="#" className="back-circle" aria-label="처음 화면으로">
            <span aria-hidden="true">←</span>
          </a>
          <div>
            <span className="mode-label">개인연습</span>
            <h1>곡 고르기</h1>
          </div>
        </div>
        <ul className="songs">
          {SONGS.map((x) => (
            <li key={x.id}>
              <a
                href="#play"
                onClick={(e) => {
                  e.preventDefault();
                  play(x);
                }}
              >
                {x.song.title}
              </a>
            </li>
          ))}
        </ul>
        <label className="trial-open">
          <span>내 컴퓨터의 악보 열기 (MusicXML)</span>
          <input
            type="file"
            accept=".musicxml,.xml,.mxl"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void open(file);
              e.target.value = "";
            }}
          />
        </label>
        {error && <p className="notice notice-error">{error}</p>}
      </main>
    );
  }

  return (
    <main className="page page-wide page-home">
      <header className="home-hero">
        <h1>아이노스 찬양연습</h1>
        <p>오늘은 어떻게 연습할까요?</p>
      </header>
      <HomeMenu links={{ group: "#group", personal: "#songs", videos: "#videos", homework: "#homework" }} />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
