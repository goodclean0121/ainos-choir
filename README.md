# 찬양연습 프로그램 개발
 
합창단 단원이 자기 파트의 음을 혼자서도 정확히 익힐 수 있게 돕는 웹앱입니다.
지금 들어 있는 것:

- **단원**: 합창단 암호를 한 번 넣으면 공개된 곡 목록(`/`)과 연습 화면(`/songs/<곡>`)을 쓸 수 있어요. 연습 화면에서는 내 파트 고르기, 다른 파트 흐리게, 계이름, 파트별 음량, 빠르기, 구간 반복, 음표 듣기, 악상기호 설명을 할 수 있어요.
- **관리자** (`/admin`): 이메일 링크로 로그인, 악보 올리기(초안), 들어 보고 공개·내리기·지우기, 합창단 암호 바꾸기.

## 실행

```bash
npm install
cp .env.example .env.local   # 값 채우기 (아래 Supabase 설정)
npm run dev                  # http://localhost:3000
```

Supabase 없이 화면만 보려면 테스트 모드로 띄워요. 곡은 메모리에만 있고, 암호는 `test-choir`, 관리자는 로그인 없이 들어가요.
**운영에서는 절대 켜지 마세요.** Supabase 환경 변수가 있으면 켜지지 않아요.

```bash
AINOS_TEST_MODE=1 npm run dev
```

## Supabase 설정 (한 번만)

1. 표와 보안 규칙: `supabase/migrations/`의 SQL이 프로젝트에 적용돼 있어요(적용 완료).
2. API 키: 대시보드 **Project Settings → API Keys**에서 publishable 키와 secret 키를 `.env.local`에 넣어요. secret 키는 서버에만 둬요.
3. 로그인 메일: **Authentication → URL Configuration**에서 Site URL을 앱 주소로(개발 중엔 `http://localhost:3000`), Redirect URLs에 `<앱 주소>/auth/confirm`을 추가해요.
4. 메일 템플릿: **Authentication → Emails**에서 **Magic Link**와 **Confirm signup** 두 템플릿의 링크를 모두
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/admin` 로 바꿔요.
   (첫 로그인은 계정을 만드는 Confirm signup 메일로 가요. 휴대폰 메일 앱이 링크를 다른 브라우저로 열어도 로그인돼요.)
   관리자 권한은 비밀번호 없이 메일 링크로 만든 계정에만 붙어요. 누가 먼저 관리자 이메일로 비밀번호 가입을 해 두었다면
   **Authentication → Users**에서 그 계정을 지우고 다시 로그인 링크를 받으세요.
5. 관리자 추가: SQL 편집기에서 `insert into private.admin_emails (email) values ('새주소@example.com');` 후 `.env.local`의 `ADMIN_EMAILS`에도 추가해요.
6. 첫 로그인 뒤 `/admin/settings`에서 합창단 암호를 정해요. 암호가 없으면 단원은 곡을 못 열어요.

MusicXML(.musicxml, .xml, .mxl)은 변환 서버 없이 브라우저에서 바로 읽습니다.
그 밖의 형식을 받으려면 변환 서버를 띄우고 주소를 알려 주세요.

```bash
docker build -t ainos-converter converter/
docker run -p 8787:8787 -e ALLOWED_ORIGIN=http://localhost:3000 ainos-converter
NEXT_PUBLIC_CONVERTER_URL=http://localhost:8787 npm run dev
```

변환 서버는 동시에 `MAX_JOBS`개(기본 2개)까지 변환하고, 그 이상은 잠시 후 다시 시도하라고 안내합니다.

Docker 없이 MuseScore만 쓸 때(Ubuntu): `sudo apt install musescore3` 후
`MSCORE_BIN=mscore3 node converter/server.mjs`.

## 지원 형식

| 형식 | 확장자 | 처리 | 정확도 |
|---|---|---|---|
| MusicXML | .musicxml, .xml | 브라우저 | 정확 |
| 압축 MusicXML | .mxl | 브라우저 | 정확 |
| MuseScore | .mscz, .mscx | 변환 서버 (MuseScore 3) | 정확 |
| MIDI | .mid, .midi | 변환 서버 (MuseScore 3) | 음은 정확, 가사·파트 이름 없음 |
| PDF | .pdf | 변환 서버 (Audiveris) | 실험: 꼭 들어 보고 확인 |
| 사진 | .png, .jpg, .jpeg | 변환 서버 (Audiveris) | 실험: 꼭 들어 보고 확인 |

Sibelius(.sib), Finale(.musx, .mus), NoteWorthy(.nwc)는 직접 읽을 수 없어 MusicXML로 내보내 달라고 안내합니다.

## 테스트

```bash
npm test               # 단위 테스트 (Vitest)
npm run test:converter # 변환 서버 테스트 (node:test)
npm run e2e            # 화면 테스트 (Playwright, 휴대폰 크기)
```

테스트용 악보는 `node tests/fixtures/make-fixtures.mjs`로 다시 만들 수 있습니다.

## 알려진 한계

- **PDF·사진 인식은 아직 실제로 돌려 보지 못했습니다.** 개발 환경에서 GitHub 릴리스 다운로드가 막혀 Audiveris를 설치할 수 없었습니다.
  `converter/Dockerfile`의 `AUDIVERIS_VERSION`, `AUDIVERIS_DEB`(파일 이름)와 `AUDIVERIS_BIN`(실행 파일 경로)은
  [Audiveris 릴리스 페이지](https://github.com/Audiveris/audiveris/releases)에서 확인해 맞춰야 합니다.
  변환 프로그램이 없으면 화면에 "변환 프로그램이 서버에 설치되어 있지 않아요"가 나옵니다.
- MuseScore와 MIDI 변환은 MuseScore 3.2(Ubuntu 패키지)로 실제 확인했습니다. MIDI는 파트 이름이 "Grand Piano"로 바뀌어 역할을 직접 골라야 합니다.
- 반복 기호는 도돌이표, `times`, 1·2·3번 괄호까지 펼칩니다. D.S., D.C., 코다는 아직 펼치지 않고 적힌 순서대로 재생합니다.
- 재생 음색은 기본 신시사이저입니다. 피아노 음색은 다음 단계에서 바꿉니다.
- 앱을 인터넷에 올리는 배포는 아직 하지 않았어요.
- iPhone에서 첫 '듣기'가 소리 없이 지나가는지 실제 기기로 아직 확인하지 못했습니다.
