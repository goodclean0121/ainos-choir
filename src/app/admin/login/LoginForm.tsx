"use client";

import { useActionState } from "react";
import { sendLoginLink, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendLoginLink, {});
  if (state.sent) return <p className="notice" role="status">{state.sent}</p>;
  return (
    <form action={action} className="unlock-form">
      <label htmlFor="email">관리자 이메일</label>
      <input id="email" name="email" type="email" autoComplete="email" required />
      <button type="submit" className="primary" disabled={pending}>
        {pending ? "보내는 중…" : "로그인 링크 받기"}
      </button>
      {state.error && (
        <p className="notice notice-error" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
