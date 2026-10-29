"use client";

import { useActionState } from "react";
import { setPasscode, type ActionState } from "../actions";

export function PasscodeForm({ hasPasscode }: { hasPasscode: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(setPasscode, {});
  return (
    <form action={action} className="unlock-form">
      <label htmlFor="passcode">{hasPasscode ? "새 합창단 암호" : "합창단 암호"}</label>
      <input id="passcode" name="passcode" type="text" autoComplete="off" required minLength={4} />
      <label htmlFor="confirm">한 번 더</label>
      <input id="confirm" name="confirm" type="text" autoComplete="off" required minLength={4} />
      <button type="submit" className="primary" disabled={pending}>
        {pending ? "저장하는 중…" : "암호 저장"}
      </button>
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
    </form>
  );
}
