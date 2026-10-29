# 악보 가져오기(여러 형식) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자가 어떤 형식의 악보 파일을 올려도 MusicXML로 통일하고, 파트(S1·S2·A·T1·T2·B 등)를 자동으로 나눠 악보를 보여주고 파트별로 들어볼 수 있는 `/import` 화면을 만든다.

**Architecture:** 모든 악보는 MusicXML을 표준 형식으로 삼는다. `.musicxml/.xml/.mxl`은 브라우저에서 바로 읽고, 그 밖의 형식(MuseScore, MIDI, PDF, 이미지)은 별도 변환 서버(`converter/`, Docker: MuseScore CLI + Audiveris)가 MusicXML로 바꿔 돌려준다. MusicXML은 직접 파싱해 내부 `ScoreModel`(파트·음표 이벤트)로 만들고, 화면 표시는 OpenSheetMusicDisplay, 재생은 Tone.js가 맡는다. Supabase 저장은 이 계획 범위 밖(다음 계획)이다.

**Tech Stack:** Next.js 16 (App Router, TypeScript), Vitest + jsdom, Playwright, jszip, opensheetmusicdisplay, tone, Node 22 (변환 서버, 내장 `node:http`), Docker.

**Spec:** `docs/superpowers/specs/2026-10-29-ainos-choir-design.md` (원본: Claude Doc 링크는 파일 안에 있음)

## Global Constraints

- 표준 형식은 MusicXML 하나. 다른 형식은 반드시 MusicXML로 변환한 뒤 같은 파서를 탄다.
- 파트 수는 고정하지 않는다. 악보의 파트·성부를 그대로 쓴다.
- 테너의 `clef-octave-change` -1(높은음자리표 아래 8)은 실제 음높이(MIDI 번호 -12)로 계산한다.
- 사진/PDF 변환 결과에는 항상 `experimental: true` 경고를 붙인다(승인 전 비공개 원칙의 근거).
- 화면 문구는 한국어. 본문 글자 18px 이상, 터치 영역 48px 이상.
- 지원하지 않는 형식(.sib, .musx, .mus, .nwc 등)은 거부하고 "악보 프로그램에서 MusicXML로 내보내 주세요" 안내를 보여준다.

## 지원 형식 표

| 형식 | 확장자 | 처리 위치 | 정확도 |
|---|---|---|---|
| MusicXML | .musicxml, .xml | 브라우저 | 정확 |
| 압축 MusicXML | .mxl | 브라우저(jszip) | 정확 |
| MuseScore | .mscz, .mscx | 변환 서버(MuseScore CLI) | 정확 |
| MIDI | .mid, .midi | 변환 서버(MuseScore CLI) | 음은 정확, 박자 표기·가사 없음 |
| PDF | .pdf | 변환 서버(Audiveris) | 실험 |
| 이미지 | .png, .jpg, .jpeg | 변환 서버(Audiveris) | 실험 |

## Review Focus

1. 반복 기호(도돌이표, 1·2번 괄호)가 있는 곡 → 재생 순서가 악보대로 펼쳐져야 한다. (Task 4에 `expandRepeats` 테스트)
2. 한 파트 안에서 성부가 화음으로만 적힌 마디와 voice로 나뉜 마디가 섞인 악보 → 마디마다 맞게 나뉘어야 한다. (Task 4 혼합 fixture 테스트)
3. 중간에 쉼표로 한 성부가 빠지는 구간(디비지가 합쳐졌다 갈라짐) → 빈 성부는 쉼, 다른 성부 음을 빌려오지 않는다. (Task 4)
4. 변환 서버가 꺼져 있거나 10분 넘게 응답 없음 → 화면이 멈추지 않고 "변환 서버에 연결할 수 없어요" 메시지와 다시 시도 버튼. (Task 7 테스트)
5. 파일 이름에 한글·공백이 있거나 확장자가 대문자(.MXL) → 정상 인식. (Task 2 테스트)

---

## File Structure

```
package.json, next.config.ts, tsconfig.json, vitest.config.ts, playwright.config.ts
src/score/types.ts              ScoreModel, PartInfo, NoteEvent, ScoreFormat 타입
src/score/detectFormat.ts       파일 이름·바이트로 형식 판별
src/score/mxl.ts                .mxl 압축 해제
src/score/parseMusicXml.ts      MusicXML → ScoreModel (파트·성부 분리)
src/score/repeats.ts            반복 기호 펼치기
src/score/roles.ts              파트 이름 → 역할 라벨(S1, A, T2 …)
src/score/importScore.ts        형식별 처리 + 변환 서버 호출
src/audio/player.ts             Tone.js 파트별 재생
src/app/import/page.tsx         가져오기 화면
src/components/ScoreView.tsx    OSMD 렌더
src/components/PartList.tsx     파트 목록 + 역할 수정 + 듣기
tests/fixtures/*.musicxml       테스트 악보
tests/score/*.test.ts           단위 테스트
e2e/import.spec.ts              Playwright
converter/server.mjs            변환 HTTP 서버
converter/convert.mjs           형식별 명령 실행
converter/convert.test.mjs      node:test
converter/Dockerfile
```

### Task 1: 프로젝트 뼈대 + 테스트 fixture

**Files:** Create: 위 설정 파일들, `src/app/layout.tsx`, `src/app/page.tsx`, `tests/fixtures/` 6개

- [ ] `create-next-app`(TypeScript, App Router, src 디렉터리, ESLint, Tailwind 없음)으로 생성. vitest(jsdom), @playwright/test, jszip, opensheetmusicdisplay, tone 추가. `npm test` = vitest run, `npm run e2e` = playwright.
- [ ] fixture 작성 (모두 2~4마디, 손으로 쓴 최소 MusicXML 3.1):
  - `four-parts.musicxml`: 파트 4개(Soprano/Alto/Tenor/Bass), 테너는 `clef-octave-change -1`.
  - `two-staves-voices.musicxml`: 파트 1개, staff 2개, voice 1/2(윗줄)·5/6(아랫줄), `<backup>` 사용.
  - `chords.musicxml`: 파트 1개, staff 2개, `<chord/>`로 두 음씩 적힘, 한 곳은 한 음(제창).
  - `mixed.musicxml`: 1마디는 화음, 2마디는 voice 분리.
  - `six-parts.musicxml`: Soprano 1, Soprano 2, Alto, Tenor 1, Tenor 2, Bass (테스트 곡 구조). 3마디에서 Alto는 온쉼표.
  - `repeats.musicxml`: 4마디, 2마디 끝 backward repeat, 1·2번 괄호(ending number 1 on m3, 2 on m4).
  - `four-parts.mxl`: four-parts.musicxml을 `META-INF/container.xml`과 함께 zip.
- [ ] `npm test` (테스트 0개로 통과), `npm run build` 통과 확인 → 커밋 `chore: scaffold Next.js app with test fixtures`

### Task 2: 형식 판별

**Interfaces:** Produces `type ScoreFormat = 'musicxml'|'mxl'|'musescore'|'midi'|'pdf'|'image'`; `detectFormat(name: string, head: Uint8Array): { format: ScoreFormat } | { error: string }` in `src/score/detectFormat.ts`.

- [ ] 테스트 `tests/score/detectFormat.test.ts`:
  - `'곡 이름.MXL'` + zip 시그니처(`PK\x03\x04`) → `mxl`; `.mscz` + zip → `musescore`; `.mscx` → `musescore`
  - `.xml` 이고 내용에 `<score-partwise` → `musicxml`; `.xml`인데 `<score-partwise`/`<score-timewise` 없음 → error
  - `.pdf` + `%PDF` → `pdf`; `.jpg` → `image`; `.mid` + `MThd` → `midi`
  - `.sib` → error 문구에 "MusicXML로 내보내" 포함; 확장자와 시그니처 불일치(.pdf인데 PK) → error
- [ ] 구현. 확장자는 소문자화, 시그니처는 앞 512바이트로 판정.
- [ ] 통과 확인 → 커밋 `feat: detect score file formats`

### Task 3: .mxl 압축 해제

**Interfaces:** Produces `unzipMxl(bytes: ArrayBuffer): Promise<string>` in `src/score/mxl.ts`.

- [ ] 테스트: `four-parts.mxl` → 결과에 `<score-partwise` 포함, 파트 4개 문자열 포함. container.xml이 없는 zip은 첫 `.musicxml|.xml`(META-INF 제외) 사용. zip 안에 악보가 없으면 `Error('압축 파일 안에 악보가 없어요')`.
- [ ] 구현: `META-INF/container.xml`의 `rootfile/@full-path` 우선.
- [ ] 통과 → 커밋 `feat: unzip compressed MusicXML`

### Task 4: MusicXML 파서 + 성부 분리 + 반복 펼치기

**Interfaces:**
```ts
// src/score/types.ts
interface PartInfo { id: string; name: string; sourcePartId: string; staff: number; voiceSlot: 'upper'|'lower'|'only' }
interface NoteEvent { partId: string; midi: number; start: number; duration: number; measure: number } // start/duration: 4분음표 = 1
interface ScoreModel { title: string; parts: PartInfo[]; notes: NoteEvent[]; tempo: number; keys: { measure: number; fifths: number; mode: 'major'|'minor' }[]; measureCount: number }
```
Produces `parseMusicXml(xml: string): ScoreModel` (`src/score/parseMusicXml.ts`), `expandRepeats(measures: MeasureMarks[]): number[]` (`src/score/repeats.ts`, 마디 번호의 재생 순서).

성부 분리 규칙(순서대로 적용):
1. 파트에 staff가 1개이고 voice가 1개, 화음 없음 → 그 파트 하나 = 성부 하나(`only`).
2. 그렇지 않으면 staff마다 위·아래 두 성부(`upper`/`lower`)를 만든다. PartInfo id는 `${partId}-s${staff}-${slot}`.
3. 마디 단위로 판단: 그 staff에 voice가 2개 이상이면 번호가 작은 voice = upper, 큰 voice = lower. voice가 1개이고 `<chord/>`가 있으면 화음의 가장 높은 음 = upper, 가장 낮은 음 = lower, 단음은 둘 다(제창).
4. 실제로 음이 하나도 없는 성부는 parts에서 뺀다.

- [ ] 테스트 `tests/score/parseMusicXml.test.ts`:
  - four-parts → parts 4개, 이름 그대로, 테너 첫 음 midi가 악보 표기보다 12 낮음(예: 표기 C5 → 60)
  - two-staves-voices → parts 4개(s1-upper, s1-lower, s2-upper, s2-lower), 각 첫 음 midi 값 fixture와 일치, `<backup>` 이후 start가 마디 시작으로 돌아감
  - chords → parts 4개, 제창 위치에서 upper·lower 같은 midi
  - mixed → 2마디 모두 upper/lower 음이 기대값과 일치
  - six-parts → parts 6개, Alto의 3마디 음표 0개(다른 성부 음을 빌려오지 않음)
  - 붙임줄(tie)로 이어진 두 음 → NoteEvent 하나, duration 합
  - tempo: `<sound tempo>` 있으면 그 값, 없으면 100; keys: fifths -1 → F major
- [ ] 테스트 `tests/score/repeats.test.ts`: repeats fixture → `[1,2,3,1,2,4]`; 반복 없음 → `[1,2,3,4]`; forward repeat 없이 backward만 있으면 1마디부터 반복.
- [ ] 구현. `parseMusicXml`은 `expandRepeats` 결과 순서로 NoteEvent의 start를 다시 매긴다. DOMParser 사용(jsdom에서 동작).
- [ ] 통과 → 커밋 `feat: parse MusicXML into parts with voice splitting and repeats`

### Task 5: 파트 역할 라벨

**Interfaces:** Produces `assignRoles(parts: PartInfo[]): Record<string, string>` (`src/score/roles.ts`), 값 예: `'S1'|'S2'|'S'|'A'|'T1'|'T'|'B'|'?'`.

- [ ] 테스트: 이름 'Soprano 1' → S1, '소프라노' → S, 'Alto'/'알토' → A, 'Tenor 2'/'T 2' → T2, 'Bass'/'베이스' → B. 이름 없는 4성부(two-staves-voices) → 위에서부터 S, A, T, B. 이름 없는 6성부 이상 → '?' (관리자가 직접 지정).
- [ ] 구현 → 통과 → 커밋 `feat: label parts with choir roles`

### Task 6: 변환 서버

**Interfaces:** `POST /convert` (body: 파일 원본, 헤더 `x-filename`) → 200 `application/vnd.recordare.musicxml+xml` 본문 + 헤더 `x-experimental: 1|0`; 400 `{ error }`; 500 `{ error }`. `GET /health` → 200. 포트 `PORT`(기본 8787), CORS 허용 출처 `ALLOWED_ORIGIN`.
`convert(inputPath: string, format: 'musescore'|'midi'|'pdf'|'image', run = execFile) : Promise<{ xmlPath: string; experimental: boolean }>` in `converter/convert.mjs`.

- [ ] 테스트 `converter/convert.test.mjs`(node:test, `run`을 가짜로 주입):
  - musescore/midi → `mscore -o <tmp>/out.musicxml <input>` 호출, experimental false
  - pdf/image → `audiveris -batch -export -output <tmp> <input>` 호출 후 `<tmp>/**/*.mxl`을 찾아 반환, experimental true
  - 명령 실패 → `Error('변환에 실패했어요')`; 10분(600000ms) 초과 → `Error('변환 시간이 너무 오래 걸려요')`
  - 서버: 50MB 초과 본문 → 413; 알 수 없는 형식 → 400
- [ ] 구현(`node:http`, 의존성 없음). Dockerfile: `eclipse-temurin:21-jre` 기반, MuseScore 3 AppImage(`--appimage-extract`)와 Audiveris 릴리스 설치, `QT_QPA_PLATFORM=offscreen`.
- [ ] `node --test converter/` 통과 → 커밋 `feat: add score conversion server`

### Task 7: 가져오기 오케스트레이터

**Interfaces:** Consumes Task 2~5. Produces `importScore(file: File, opts: { converterUrl?: string; fetch?: typeof fetch }): Promise<{ xml: string; model: ScoreModel; roles: Record<string,string>; format: ScoreFormat; warnings: string[] }>` in `src/score/importScore.ts`.

- [ ] 테스트:
  - musicxml/mxl fixture → fetch 호출 없이 model 반환
  - pdf → 변환 서버에 POST, 응답 `x-experimental: 1` → warnings에 "자동 인식 결과라 틀린 음이 있을 수 있어요. 꼭 들어보고 확인하세요." 포함
  - converterUrl 없음 + pdf → Error "이 형식은 변환 서버가 필요해요"
  - fetch가 거부(서버 꺼짐) → Error "변환 서버에 연결할 수 없어요"
  - 변환 서버가 .mxl(zip)로 응답 → unzipMxl 거쳐 파싱
- [ ] 구현 → 통과 → 커밋 `feat: import scores of any supported format`

### Task 8: `/import` 화면 + 파트별 듣기

**Interfaces:** Consumes `importScore`. Produces `createPlayer(model: ScoreModel): { play(opts: { volumes: Record<string, number>; tempoRatio: number }): Promise<void>; stop(): void }` in `src/audio/player.ts` (Tone.js, 파트마다 `Tone.Channel`, 음색은 `Tone.PolySynth` — 피아노 샘플은 다음 계획).

- [ ] 화면: 파일 선택(드래그 가능, accept에 지원 확장자 전부) → 형식 표시 → warnings 노란 상자 → 파트 목록(이름, 역할 드롭다운, "이 파트만 듣기" 버튼, 음량 슬라이더) → 전체 듣기/정지 → OSMD 악보. 변환 중엔 "악보를 변환하고 있어요…" 표시, 오류 시 문구 + "다시 시도".
- [ ] 단위 테스트 `tests/audio/player.test.ts`: Tone을 mock, 음량 0인 파트는 스케줄되지 않음, tempoRatio 0.5면 Transport bpm이 tempo×0.5.
- [ ] e2e `e2e/import.spec.ts`(모바일 뷰포트 390×844): six-parts.musicxml 업로드 → 파트 6개 행 표시, 역할 S1·S2·A·T1·T2·B, 악보 SVG 렌더됨. `.sib` 업로드 → 안내 문구. converter 미설정 + pdf → "변환 서버가 필요해요".
- [ ] `npm test && npm run e2e && npm run build` 통과 → 커밋 `feat: import page with per-part preview`

### Task 9: 실제 악보로 확인

- [ ] 테스트 곡 PDF(`A Wonderful Time Up There`, 16쪽)를 로컬 변환 서버(가능하면 Docker, 아니면 Audiveris 직접 실행)로 변환해 `/import`에서 열어 본다. 결과(파트 수, 눈에 띄는 오인식)를 README의 "알려진 한계"에 적는다. 변환이 환경 문제로 불가하면 그 이유를 적는다.
- [ ] README: 실행 방법(`npm run dev`, 변환 서버 Docker 실행), 지원 형식 표 → 커밋 `docs: README with supported formats`
