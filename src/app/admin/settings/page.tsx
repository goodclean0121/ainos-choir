import type { Metadata } from "next";
import { Suspense } from "react";
import { getAdminStore } from "@/server/admin";
import { requireAdmin } from "@/server/requireAdmin";
import { AdminNav } from "../AdminShell";
import { PasscodeForm } from "./PasscodeForm";

export const metadata: Metadata = { title: "합창단 암호 - 아이노스 찬양연습" };

async function Settings() {
  const admin = await requireAdmin();
  const access = await (await getAdminStore()).getAccess();
  return (
    <>
      <AdminNav email={admin.email} />
      <h1>합창단 암호</h1>
      <p className="lead">
        {access
          ? "암호를 바꾸면 모든 단원이 다음에 열 때 새 암호를 넣어야 해요."
          : "아직 암호가 없어서 단원들이 곡을 열 수 없어요. 단원들에게 알려 줄 암호를 정해 주세요."}
      </p>
      <PasscodeForm hasPasscode={!!access} />
    </>
  );
}

export default function SettingsPage() {
  return (
    <main className="page">
      <Suspense fallback={<p role="status">불러오는 중…</p>}>
        <Settings />
      </Suspense>
    </main>
  );
}
