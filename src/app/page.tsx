import Link from "next/link";

export default function Home() {
  return (
    <main className="page">
      <h1>아이노스 찬양연습</h1>
      <p>
        <Link href="/import">악보 가져오기</Link>
      </p>
    </main>
  );
}
