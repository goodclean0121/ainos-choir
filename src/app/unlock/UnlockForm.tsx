"use client";

import { useActionState } from "react";
import { unlock, type UnlockState } from "./actions";

export function UnlockForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<UnlockState, FormData>(unlock, {});
  return (
    <form action={action} className="unlock-form">
      <input type="hidden" name="next" value={next} />
      <label htmlFor="passcode">합창단 암호</label>
      <input id="passcode" name="passcode" type="password" autoComplete="current-password" required autoFocus />
      <button type="submit" className="primary" disabled={pending}>
        {pending ? "확인하는 중…" : "들어가기"}
      </button>
      {state.error && (
        <p className="notice notice-error" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
