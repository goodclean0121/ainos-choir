import type { Metadata } from "next";
import { Suspense } from "react";
import { safeNext } from "@/server/memberGate";
import { UnlockForm } from "./UnlockForm";

export const metadata: Metadata = { title: "합창단 암호 - 파트노트" };

async function Form({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <UnlockForm next={safeNext(next)} />;
}

export default function UnlockPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <main className="page page-unlock">
      <h1>파트노트</h1>
      <p className="lead">합창단 암호를 한 번 넣으면 이 기기에서는 다시 묻지 않아요.</p>
      <Suspense>
        <Form searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
