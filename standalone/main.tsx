import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { GroupPractice, type PdfScore } from "@/components/GroupPractice";
import { VideoGallery } from "@/components/VideoGallery";
import { RehearsalCalendar } from "@/components/RehearsalCalendar";
import { AppShell, type TabId } from "@/components/partnote/AppShell";
import { HomeScreen } from "@/components/partnote/HomeScreen";
import { GOAL_TICKS_KEY, PRACTICE_LOG_KEY, ScoreScreen, type ScoreSegment } from "@/components/partnote/ScoreScreen";
import { ScheduleScreen, type ScheduleSegment } from "@/components/partnote/ScheduleScreen";
import { MembersScreen, type MembersSegment } from "@/components/partnote/MembersScreen";
import { Practice } from "@/app/songs/[id]/Practice";
import { songProgress, weekOf } from "@/practice/goals";
import { readStored, useTicks, writeStored } from "@/practice/local";
import { addSeconds, type PracticeLog } from "@/practice/time";
import { dayKey, upcoming, type RehearsalSong } from "@/schedule/calendar";
import { importScore } from "@/score/importScore";
import type { Song } from "@/songs/loadSong";
import demoXml from "@/server/seed/practice-example.musicxml?raw";
import { sampleRehearsals } from "./schedule";
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

const EVENTS = sampleRehearsals(PDFS.map((p) => p.id));

/** The PDF and the sounding score of one song carry slightly different titles; match on their start. */
function sameSong(a: string, b: string): boolean {
  const norm = (t: string) => t.toLowerCase().replace(/[\s()]/g, "");
  const [x, y] = [norm(a), norm(b)];
  const n = Math.min(x.length, y.length, 10);
  return n > 0 && x.slice(0, n) === y.slice(0, n);
}

type Route = { view: string; arg?: string };
function readRoute(): Route {
  const [view = "", arg] = location.hash.slice(1).split("/");
  // Older links from the earlier trial keep working.
  if (view === "group") return { view: "pdf", arg };
  if (view === "songs") return { view: "score", arg: "personal" };
  if (view === "homework") return { view: "score", arg: "tasks" };
  return { view: view || "home", arg };
}

/** A trial build of the app that runs from one file, with no server. The hash picks the screen. */
function App() {
  const [route, setRoute] = useState<Route>(readRoute);
  const [pdfs, setPdfs] = useState(PDFS);
  const [openedFile, setOpenedFile] = useState<{ id: string; song: Song }>();
  const [error, setError] = useState<string>();
  const [ticks] = useTicks(GOAL_TICKS_KEY);
  const today = dayKey(new Date());

  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Time spent in practice mode adds up, on this device, toward the week's practice time.
  useEffect(() => {
    if (route.view !== "play") return;
    const started = Date.now();
    return () => {
      const seconds = Math.round((Date.now() - started) / 1000);
      if (seconds < 5) return;
      writeStored(PRACTICE_LOG_KEY, addSeconds(readStored<PracticeLog>(PRACTICE_LOG_KEY, {}), dayKey(new Date()), seconds));
    };
  }, [route.view]);

  async function addPdf(file: File): Promise<PdfScore> {
    if (file.type && file.type !== "application/pdf") throw new Error("PDF 파일만 추가할 수 있어요");
    const src = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("파일을 읽지 못했어요"));
      reader.readAsDataURL(file);
    });
    const score = { id: `file-${file.name}-${file.lastModified}`, title: file.name.replace(/\.pdf$/i, ""), src };
    setPdfs((list) => [...list, score]);
    return score;
  }

  async function openFile(file: File) {
    setError(undefined);
    try {
      const imported = await importScore(file);
      setOpenedFile({
        id: `file-${file.name}-${file.lastModified}`,
        song: { title: file.name.replace(/\.[^.]+$/, ""), xml: imported.xml, roles: imported.roles },
      });
      window.location.assign("#play/file");
    } catch (e) {
      setError(e instanceof Error ? e.message : "악보를 열지 못했어요");
    }
  }

  const pdfHref = (song: RehearsalSong) => {
    const i = pdfs.findIndex((p) => p.id === song.scoreId);
    return i >= 0 ? `#pdf/${i}` : undefined;
  };
  const practices = upcoming(EVENTS, today, "practice");
  const performance = upcoming(EVENTS, today, "performance")[0];
  const week = weekOf(today);
  const weekSongTitles = [...new Set(practices[0]?.songs.map((s) => s.title) ?? [])];

  // Full-screen views: the score itself gets the whole screen, with no tab bar.
  if (route.view === "pdf") {
    return (
      <main className="page page-practice">
        <GroupPractice
          key={route.arg ?? "list"}
          scores={pdfs}
          backHref="#score/group"
          onAdd={addPdf}
          initialId={route.arg === undefined ? undefined : pdfs[Number(route.arg)]?.id}
        />
      </main>
    );
  }
  if (route.view === "play") {
    const picked = route.arg === "file" ? openedFile : SONGS[Number(route.arg ?? 0)];
    const song = picked ?? SONGS[0];
    return (
      <main className="page page-practice">
        <Practice key={song.id} songId={song.id} song={song.song} backHref="#score/personal" />
      </main>
    );
  }

  let tab: TabId = "home";
  let body: React.ReactNode;
  if (route.view === "score") {
    tab = "score";
    const segment = (["group", "personal", "tasks"].includes(route.arg ?? "") ? route.arg : "group") as ScoreSegment;
    const inPractice = new Set(practices[0]?.songs.map((s) => s.scoreId));
    body = (
      <>
        <ScoreScreen
          segment={segment}
          segmentHref={(s) => `#score/${s}`}
          today={today}
          scores={pdfs.map((p, i) => {
            const listen = SONGS.findIndex((s) => sameSong(s.song.title, p.title));
            return {
              id: p.id,
              title: p.title,
              openHref: `#pdf/${i}`,
              listenHref: listen >= 0 ? `#play/${listen}` : undefined,
              memos: 0,
              inThisPractice: inPractice.has(p.id),
            };
          })}
          weekSongs={weekSongTitles}
          playable={SONGS.map((s, i) => ({ id: s.id, title: s.song.title, href: `#play/${i}` }))}
          onAddScore={(file) => void addPdf(file)}
          onOpenFile={(file) => void openFile(file)}
        />
        {error && <p className="notice notice-error screen-notice">{error}</p>}
      </>
    );
  } else if (route.view === "schedule" || route.view === "calendar" || route.view === "videos") {
    tab = "schedule";
    if (route.view === "calendar") {
      body = (
        <div className="screen">
          <RehearsalCalendar
            rehearsals={EVENTS}
            backHref="#schedule"
            scoreHref={pdfHref}
            notice="체험판이라 예시 일정을 넣어 뒀어요. 실제 앱에서는 관리자가 일정을 올려요."
          />
        </div>
      );
    } else if (route.view === "videos") {
      body = (
        <div className="screen">
          <VideoGallery videos={[]} backHref="#schedule/sunday" />
        </div>
      );
    } else {
      body = (
        <ScheduleScreen
          segment={route.arg === "sunday" ? "sunday" : ("wednesday" as ScheduleSegment)}
          segmentHref={(s) => `#schedule/${s}`}
          today={today}
          practices={practices}
          performance={performance}
          scoreHref={pdfHref}
          calendarHref="#calendar"
          videosHref="#videos"
        />
      );
    }
  } else if (route.view === "members") {
    tab = "members";
    const segment = (["notices", "people", "votes"].includes(route.arg ?? "") ? route.arg : "notices") as MembersSegment;
    body = <MembersScreen segment={segment} segmentHref={(s) => `#members/${s}`} />;
  } else {
    body = (
      <HomeScreen
        choirName="아이노스 합창단"
        today={today}
        performance={performance}
        practices={practices}
        weekSongs={(practices[0]?.songs ?? []).map((s) => ({
          title: s.title,
          detail: s.note,
          progress: songProgress(ticks, week, s.title),
          href: pdfHref(s) ?? "#score/group",
        }))}
        scheduleHref="#schedule/sunday"
        practiceHref="#score/personal"
      />
    );
  }

  return (
    <AppShell
      tab={tab}
      links={{ home: "#home", score: "#score/group", schedule: "#schedule/wednesday", members: "#members/notices" }}
    >
      {body}
    </AppShell>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
