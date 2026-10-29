import Link from "next/link";
import { signOut } from "./actions";

export function AdminNav({ email }: { email: string }) {
  return (
    <nav className="admin-nav" aria-label="관리자 메뉴">
      <Link href="/admin">곡 관리</Link>
      <Link href="/admin/new">새 곡 올리기</Link>
      <Link href="/admin/settings">합창단 암호</Link>
      <form action={signOut}>
        <button type="submit" title={email}>
          로그아웃
        </button>
      </form>
    </nav>
  );
}
