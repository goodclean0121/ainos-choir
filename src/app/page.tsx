import { readFileSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import type { SongEntry } from "@/songs/loadSong";

function songs(): SongEntry[] {
  return JSON.parse(readFileSync(join(process.cwd(), "public", "songs", "index.json"), "utf8"));
}

export default function Home() {
  return (
    <main className="page">
      <h1>아이노스 찬양연습</h1>
      <p className="lead">곡을 고르고 내 파트를 정하면, 내 음만 진하게 보면서 따라 부를 수 있어요.</p>
      <ul className="songs">
        {songs().map((s) => (
          <li key={s.id}>
            <Link href={`/songs/${s.id}`}>{s.title}</Link>
          </li>
        ))}
      </ul>
      <p className="home-admin">
        <Link href="/import">악보 가져오기</Link>
      </p>
    </main>
  );
}
