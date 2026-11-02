# 관리자 업로드와 곡 저장 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자가 올리고 공개한 곡을 단원들이 합창단 암호 하나로 열어 연습 화면에서 쓴다.

**Architecture:** 곡은 Supabase `songs` 표에 MusicXML 본문째 저장한다. 모든 표는 RLS로 관리자(app_metadata.role = admin)만 다룬다. 단원 브라우저는 Supabase에 직접 묻지 않고, Next.js 서버가 서명한 암호 쿠키를 확인한 뒤 서버 전용 키로 공개 곡만 읽어 넘긴다. 저장소는 `SongStore` 인터페이스 뒤에 Supabase 구현과 메모리 구현(테스트·e2e용, `AINOS_TEST_MODE=1`일 때만)을 둔다.

**Tech Stack:** 기존 + `@supabase/supabase-js` 2.118.0, `@supabase/ssr` 0.12.7 (버전 고정).

**Spec:** Claude Doc "관리자 업로드와 곡 저장 설계" (https://claude.ai/artifact/8Ud6qUQviYXVBUxf8Dhcow), 요약 사본 `docs/superpowers/specs/2026-10-29-admin-songs-design.md`.

## Global Constraints

- 관리자: goodclean0121@gmail.com 한 명. 관리자 판정은 DB에서 `auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'`. user_metadata는 쓰지 않는다.
- 서버 전용 키 `SUPABASE_SECRET_KEY`, 쿠키 서명 비밀 `ACCESS_COOKIE_SECRET`은 `NEXT_PUBLIC_`이 아니다.
- 암호 쿠키 1년, httpOnly, sameSite=lax, secure(운영). 암호 버전이 바뀌면 무효.
- 암호 틀림: 같은 IP 1분에 10번까지.
- 자동 인식 곡(experimental)은 `checked = true`일 때만 공개 가능.
- 화면 문구 한국어, 18px, 터치 48px.

## Review Focus

1. 익명 키로 `songs`, `choir_access`를 읽으면 0줄 (Task 3 SQL 확인).
2. 암호를 바꾼 뒤 예전 쿠키로 곡 목록/곡을 열면 암호 화면으로 (Task 1, Task 5).
3. 초안 곡 id를 알아도 단원 경로로는 못 연다 (Task 2, Task 5).
4. `AINOS_TEST_MODE`가 운영에서 켜지면 관리자 우회가 생김 → Supabase 환경 변수가 있으면 테스트 모드를 거부 (Task 4).
5. 메일 앱이 다른 브라우저로 링크를 열어도 로그인 (token_hash 방식, Task 6).

---

### Task 1: 암호와 쿠키 (`src/server/access.ts`)
**Interfaces:** `hashPasscode(code): string` (scrypt, `salt:hash`), `verifyPasscode(code, stored): boolean`, `signAccess(version, secret): string`, `readAccess(cookie, secret): number | null` (서명이 맞으면 버전), `createRateLimiter({limit, windowMs, now?}) → { hit(key): boolean }`.
- [ ] 테스트: 맞는/틀린 암호, 앞뒤 공백 무시, 서명 위조·다른 비밀 → null, 11번째 시도 false, 1분 지나면 다시 true.
- [ ] 커밋 `feat: choir passcode and access cookie`

### Task 2: 곡 저장소 (`src/server/songStore.ts`, `memoryStore.ts`)
**Interfaces:** `SongRecord { id; title; xml; roles; status: "draft"|"published"; experimental; checked; createdAt; updatedAt }`, `SongStore { listPublished(); getPublished(id); listAll(); get(id); create(input); update(id, patch); remove(id); getAccess(); setAccess(hash) }` (`getAccess → {hash, version} | null`, `setAccess`는 버전 +1). `canPublish(song): string | null` (안 되는 이유).
- [ ] 테스트(메모리 구현): 초안은 listPublished/getPublished에 없음, experimental 미확인은 publish 거부, setAccess가 버전 올림, 데모 곡 시드 옵션.
- [ ] 커밋 `feat: song store with memory implementation`

### Task 3: Supabase 스키마 (`supabase/migrations/*_songs.sql`)
- [ ] `songs`, `choir_access`(단일 행, id=1) 표, RLS 켜기, anon 권한 회수, 관리자 select/insert/update/delete 정책(update는 using+with check), `updated_at` 트리거.
- [ ] `private.admin_emails` + `auth.users` insert/update 트리거로 해당 이메일에 `raw_app_meta_data.role = 'admin'` 부여 (security definer, private 스키마, search_path 고정).
- [ ] MCP로 적용 후 확인: anon 역할로 select → 0줄, advisors 보안 점검 깨끗.
- [ ] 커밋 `feat: supabase schema for songs`

### Task 4: Supabase 연결 (`src/server/supabaseStore.ts`, `src/server/store.ts`, `src/lib/supabase/*`, `proxy.ts`)
**Interfaces:** `getStore(): SongStore` (테스트 모드면 메모리 싱글톤, 아니면 서버 전용 키 클라이언트), `getAdmin(): Promise<{email} | null>` (세션 클라이언트 `getClaims`, app_metadata.role 확인; 테스트 모드면 가짜 관리자), `isTestMode()`.
- [ ] 테스트: Supabase 환경 변수가 있으면 테스트 모드를 켜도 Error, supabaseStore가 행 ↔ SongRecord를 바르게 바꿈(가짜 클라이언트).
- [ ] 커밋 `feat: connect the song store to supabase`

### Task 5: 단원 화면
- [ ] `/unlock` 암호 화면 + `POST /api/unlock`(제한·쿠키). 홈과 `/songs/[id]`는 쿠키가 없거나 버전이 다르면 `/unlock?next=`로.
- [ ] 홈은 `listPublished()`. 연습 화면은 서버에서 `getPublished(id)` 후 `Practice`에 곡을 넘김(`loadSong`의 정적 목록 제거, `imported`는 유지).
- [ ] 정적 `public/songs/` 제거, 예제 곡은 테스트 모드 시드로.
- [ ] 커밋 `feat: choir passcode gate for members`

### Task 6: 관리자 화면
- [ ] `/admin/login`(이메일 → `signInWithOtp`, 허용 이메일만), `/auth/confirm`(token_hash → `verifyOtp`, code → `exchangeCodeForSession`).
- [ ] `/admin` 목록(상태, 공개/내리기/삭제, 미리 보기), `/admin/new`(ImportScore + 제목 + "초안으로 저장"), `/admin/songs/[id]`(미리 보기 = 연습 화면, 자동 인식 확인 체크, 공개), `/admin/settings`(암호 바꾸기).
- [ ] 모든 쓰기는 서버 액션에서 `getAdmin()` 확인 후. Supabase 모드에선 세션 클라이언트로 써서 RLS가 한 번 더 막음.
- [ ] 커밋 `feat: admin screens`

### Task 7: e2e와 문서
- [ ] e2e(테스트 모드, 390×844): 암호 없이 홈 → 암호 화면, 틀린 암호 안내, 맞는 암호 → 목록 → 연습; 관리자: 새 곡 저장 → 단원 목록에 없음 → 공개 → 목록에 있음; 암호 변경 후 예전 쿠키 → 암호 화면.
- [ ] README: 환경 변수, Supabase 대시보드 설정(메일 템플릿 token_hash, Site URL), 관리자 추가 방법.
- [ ] 커밋 `test: e2e for passcode and admin flow`
