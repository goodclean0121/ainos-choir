"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPasscode } from "@/server/access";
import { getAdminStore } from "@/server/admin";
import { requireAdmin } from "@/server/requireAdmin";
import { newSongError, type NewSong, type SongPatch } from "@/server/songStore";
import { createSessionClient } from "@/lib/supabase/server";
import { isTestMode } from "@/server/store";

export interface ActionState {
  error?: string;
  done?: string;
}

const MIN_PASSCODE = 4;

export async function saveDraft(song: NewSong): Promise<ActionState> {
  await requireAdmin();
  // Only these fields come from the browser; status and checks always start fresh.
  const input: NewSong = {
    title: String(song.title ?? "").trim(),
    xml: String(song.xml ?? ""),
    roles: song.roles && typeof song.roles === "object" ? song.roles : {},
    experimental: song.experimental === true,
  };
  const problem = newSongError(input);
  if (problem) return { error: problem };
  let id: string;
  try {
    id = (await (await getAdminStore()).create(input)).id;
  } catch {
    return { error: "저장하지 못했어요. 잠시 뒤에 다시 해 주세요." };
  }
  revalidatePath("/admin");
  redirect(`/admin/songs/${id}`);
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
