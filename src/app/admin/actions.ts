"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPasscode } from "@/server/access";
import { getAdminStore } from "@/server/admin";
import { requireAdmin } from "@/server/requireAdmin";
import type { NewSong, SongPatch } from "@/server/songStore";
import { createSessionClient } from "@/lib/supabase/server";
import { isTestMode } from "@/server/store";

export interface ActionState {
  error?: string;
  done?: string;
}

const MIN_PASSCODE = 4;

export async function saveDraft(song: NewSong): Promise<ActionState> {
  await requireAdmin();
  const title = song.title.trim();
  if (!title) return { error: "곡 제목을 적어 주세요." };
  if (!song.xml.includes("<score-partwise") && !song.xml.includes("<score-timewise")) {
    return { error: "악보 내용이 비어 있어요. 다시 가져와 주세요." };
  }
  const saved = await (await getAdminStore()).create({ ...song, title });
  revalidatePath("/admin");
  redirect(`/admin/songs/${saved.id}`);
}

export async function updateSong(id: string, patch: SongPatch): Promise<ActionState> {
  await requireAdmin();
  try {
    await (await getAdminStore()).update(id, patch);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "저장하지 못했어요." };
  }
  revalidatePath("/admin");
  revalidatePath(`/admin/songs/${id}`);
  revalidatePath("/");
  return { done: patch.status === "published" ? "공개했어요. 단원 목록에 보여요." : patch.status === "draft" ? "내렸어요. 단원 목록에서 사라졌어요." : "저장했어요." };
}

export async function deleteSong(id: string): Promise<void> {
  await requireAdmin();
  await (await getAdminStore()).remove(id);
  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin");
}

export async function setPasscode(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const code = String(form.get("passcode") ?? "").trim();
  if (code.length < MIN_PASSCODE) return { error: `암호는 ${MIN_PASSCODE}자 이상으로 정해 주세요.` };
  if (code !== String(form.get("confirm") ?? "").trim()) return { error: "두 번 적은 암호가 서로 달라요." };
  await (await getAdminStore()).setAccess(hashPasscode(code));
  return { done: "새 암호를 저장했어요. 단원들은 다음에 열 때 새 암호를 넣어야 해요." };
}

export async function signOut(): Promise<void> {
  if (!isTestMode()) await (await createSessionClient()).auth.signOut();
  redirect("/admin/login");
}
