import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "관리자 로그인 - 아이노스 찬양연습" };

export default function AdminLogin() {
  return (
    <main className="page page-unlock">
      <h1>관리자 로그인</h1>
      <p className="lead">이메일로 받은 링크를 누르면 들어와요. 비밀번호는 없어요.</p>
      <LoginForm />
    </main>
  );
}
