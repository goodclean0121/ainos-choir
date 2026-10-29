import type { Metadata } from "next";
import { ImportScore } from "./ImportScore";

export const metadata: Metadata = { title: "악보 가져오기 - 아이노스 찬양연습" };

export default function ImportPage() {
  return (
    <main className="page">
      <h1>악보 가져오기</h1>
      <p className="lead">
        악보 파일을 올리면 파트를 나눠서 보여 드려요. 공개하기 전에 파트마다 들어 보고 음이 맞는지 확인하세요.
      </p>
      <ImportScore converterUrl={process.env.NEXT_PUBLIC_CONVERTER_URL} />
    </main>
  );
}
