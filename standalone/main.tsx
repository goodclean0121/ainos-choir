import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { Practice } from "@/app/songs/[id]/Practice";
import { importScore } from "@/score/importScore";
import type { Song } from "@/songs/loadSong";
import demoXml from "@/server/seed/practice-example.musicxml?raw";
import "@/app/globals.css";
import "./standalone.css";

const DEMO: Song = { title: "연습용 예제 (4성부 화음 연습)", xml: demoXml };

/** A trial build of the practice screen that runs from one file, with no server. */
function App() {
  const [song, setSong] = useState<{ id: string; song: Song }>({ id: "demo", song: DEMO });
  const [error, setError] = useState<string>();

  async function open(file: File) {
    setError(undefined);
    try {
      const imported = await importScore(file);
      setSong({
        id: `file-${file.name}-${file.lastModified}`,
        song: { title: file.name.replace(/\.[^.]+$/, ""), xml: imported.xml, roles: imported.roles },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "악보를 열지 못했어요");
    }
  }

  return (
    <main className="page page-practice">
      <div className="trial-bar">
        <span>체험판: 서버 없이 이 컴퓨터에서만 돌아가요.</span>
        <label className="trial-open">
          <span>다른 악보 열기 (MusicXML)</span>
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
      </div>
      {error && <p className="notice notice-error">{error}</p>}
      <Practice key={song.id} songId={song.id} song={song.song} />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
