"use client";

import { useState, useTransition } from "react";
import type { SongRecord } from "@/server/songStore";
import { deleteSong, updateSong, type ActionState } from "../../actions";

type Props = Pick<SongRecord, "id" | "title" | "status" | "experimental" | "checked">;

export function SongControls({ id, title: savedTitle, status, experimental, checked }: Props) {
  const [title, setTitle] = useState(savedTitle);
  const [state, setState] = useState<ActionState>({});
  const [pending, start] = useTransition();
  const blocked = experimental && !checked;

  const run = (patch: Parameters<typeof updateSong>[1]) =>
    start(async () => setState(await updateSong(id, patch)));

  return (
    <section className="song-controls" aria-label="곡 관리">
      <div className="song-status">
        <span className={`badge badge-${status}`}>{status === "published" ? "공개 중" : "초안"}</span>
        <span className="hint">{status === "published" ? "단원 목록에 보여요." : "단원에게는 아직 보이지 않아요."}</span>
      </div>

      <label className="title-field">
        <span>곡 제목</span>
        <input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
      </label>
      {title.trim() !== savedTitle && (
        <button type="button" disabled={pending || !title.trim()} onClick={() => run({ title: title.trim() })}>
          제목 저장
        </button>
      )}

      {experimental && (
        <label className="check-field">
          <input type="checkbox" checked={checked} disabled={pending} onChange={(e) => run({ checked: e.target.checked })} />
          <span>자동 인식한 악보예요. 파트마다 들어 보고 음이 맞는지 확인했어요.</span>
        </label>
      )}

      <div className="song-actions">
        {status === "draft" ? (
          <button type="button" className="primary" disabled={pending || blocked} onClick={() => run({ status: "published" })}>
            공개하기
          </button>
        ) : (
          <button type="button" disabled={pending} onClick={() => run({ status: "draft" })}>
            공개 내리기
          </button>
        )}
        <button
          type="button"
          className="danger"
          disabled={pending}
          onClick={() => {
            if (window.confirm(`"${savedTitle}"을(를) 지울까요? 되돌릴 수 없어요.`)) start(() => deleteSong(id));
          }}
        >
          지우기
        </button>
      </div>
      {blocked && <p className="hint">확인 칸에 체크해야 공개할 수 있어요.</p>}
      {state.error && (
        <p className="notice notice-error" role="alert">
          {state.error}
        </p>
      )}
      {state.done && (
        <p className="notice" role="status">
          {state.done}
        </p>
      )}
    </section>
  );
}
