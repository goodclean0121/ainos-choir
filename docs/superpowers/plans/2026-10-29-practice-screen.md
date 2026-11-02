# 연습 화면 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 단원이 곡을 열어 자기 파트를 고르고, 내 파트만 진하게 보이는 악보와 함께 듣고(파트별 음량, 빠르기, 구간 반복), 계이름을 켜고, 음표·악상기호를 눌러 배울 수 있는 `/songs/[id]` 연습 화면을 만든다.

**Architecture:** 악보 모양 바꾸기는 MusicXML을 고쳐서 OSMD에 넘기는 방식으로 한다. 내 파트가 아닌 음표에는 `<notehead color>`·`<stem color>`로 회색을 입히고, 계이름은 내 파트 음표에 `<lyric>`으로 넣는다. 이를 위해 파서가 각 파트 줄이 어느 `<note>` 요소(문서 순서 번호)로 이루어졌는지 알려 준다. 곡은 저장 기능이 생기기 전까지 `public/songs/`의 정적 파일과, 가져오기 화면에서 넘긴 악보(sessionStorage) 두 곳에서 연다.

**Tech Stack:** 기존과 같음 (Next.js 16, Vitest, Playwright, OSMD 2.2, Tone.js).

**Spec:** `docs/superpowers/specs/2026-10-29-ainos-choir-design.md`

## Global Constraints

- 계이름은 이동도: 조표의 장조 으뜸음이 '도'(단조도 같은 조표면 같은 '도', 즉 '라' 으뜸음 단조). 조표에 없는 올림은 '#', 내림은 '♭'를 붙인다(예: 파#, 시♭).
- 연습 화면 기본 음량: 내 파트 1, 다른 파트 0.35. 빠르기 50~120%.
- 내 파트 선택은 곡마다 기기에 기억(localStorage, 실패해도 동작).
- 악상기호 설명은 한 줄, 쉬운 말. 사전에 없는 표기는 원문 그대로만 보여준다.
- 화면 문구 한국어, 본문 18px 이상, 터치 영역 48px 이상.

## Review Focus

1. 조가 바뀌는 곡 → 바뀐 마디부터 새 '도'. (Task 2 테스트)
2. 반복으로 같은 마디가 두 번 연주될 때 구간 반복 범위 → 악보 순서(재생 순서)로 정확히. (Task 4 테스트)
3. 화음으로 적힌 성부(두 파트가 기둥 공유) → 내 음만 진하고, 계이름이 내 음 기준. (Task 3 테스트)
4. 재생 중 음량을 바꾸면 바로 반영. (Task 4 테스트)
5. localStorage를 못 쓰는 브라우저(사생활 보호 모드) → 화면이 깨지지 않음. (Task 6)

---

### Task 1: 파서가 줄별 `<note>` 번호와 재생 타임라인을 알려 주기

**Interfaces:** `ScoreModel`에 추가:
```ts
lineNotes: Record<string, number[]>; // partId → 그 줄을 이루는 <note> 요소의 문서 순서 번호(0부터, 쉼표·꾸밈음 포함 모든 <note> 기준)
timeline: { measure: number; start: number; length: number }[]; // 재생 순서대로 마디 시작(4분음표 단위)
```
- [ ] 테스트: four-parts의 P1 lineNotes 길이 = P1 음표 수(쉼표 제외), 첫 값 0. chords의 s1-upper 첫 값은 화음의 높은 음 요소 번호. repeats의 timeline = 마디 [1,2,3,1,2,4], start [0,4,8,12,16,20].
- [ ] 구현: `readPart`에서 전체 `<note>` 카운터(파트를 넘어 문서 순서)를 RawNote에 `xmlIndex`로 저장. 커밋 `feat: expose note indices and played timeline`

### Task 2: 이동도 계이름

**Interfaces:** `solfege(step: string, alter: number, fifths: number): string` in `src/score/solfege.ts`.
- [ ] 테스트: fifths 0: C→도, E→미, B→시, F#(alter 1)→파#, Bb→시♭. fifths -1(F장조/라단조): F→도, Bb→파, B(alter 0)→파#, E→시. fifths 2(D장조): D→도, F#→미, F(alter 0)→미♭, C#→시. fifths -3(Eb): Eb→도, Ab→파, A(0)→파#.
- [ ] 구현. 커밋 `feat: movable-do solfege`

### Task 3: 악보 꾸미기 (내 파트 강조 + 계이름)

**Interfaces:** `decorateScore(xml: string, opts: { notes: number[]; solfege: boolean; dimColor?: string }): string` in `src/score/decorate.ts`. `notes` = 내 줄의 `<note>` 번호.
- [ ] 테스트(jsdom DOMParser): four-parts, P1 선택 → P2~P4의 모든 음표에 `notehead[color]`, P1 음표엔 없음. solfege true → P1 첫 음표에 `<lyric number="solfege">` 텍스트 '라'? (F장조 E5 → 미). chords s1-upper 선택 → 첫 화음의 높은 음엔 색 없음·계이름 있음, 낮은 음은 회색. 쉼표에는 아무것도 안 붙임. 원래 있던 가사 `<lyric>`은 지우지 않음.
- [ ] 구현: 조표는 마디 순서로 따라가며 각 음의 fifths를 구함. 커밋 `feat: dim other parts and add solfege to the score`

### Task 4: 재생기 확장 (구간 반복, 실시간 음량, 마디 알림, 한 음 재생)

**Interfaces:** `createPlayer(model, tone)`이 돌려주는 객체에 추가/변경:
```ts
play(opts: { volumes; tempoRatio; from?: number; to?: number; loop?: boolean; onMeasure?(measure: number): void; onEnd?(): void }): Promise<void>
// from/to = timeline 인덱스(0부터, 재생 순서 기준)
setVolume(partId: string, volume: number): void
playNote(midi: number): Promise<void>
```
- [ ] 테스트(가짜 Tone): from/to 범위 밖 음표는 예약 안 됨, 범위 안 음표는 시작을 0으로 당김. loop true면 transport.loop=true, loopEnd = 범위 길이(초). setVolume이 해당 채널 volume.value를 dB로 바꿈. onMeasure가 범위 안 마디마다 예약됨. onEnd는 loop false일 때 끝 시각에 예약.
- [ ] 구현: Tone.Channel의 `volume.value` 사용. 커밋 `feat: loop sections and live volume in the player`

### Task 5: 악상기호 사전

**Interfaces:** `GLOSSARY: GlossaryEntry[]` (`{ id; symbol; name; meaning; match: (el: Element) => boolean }`) and `findMarkings(xml: string): GlossaryEntry[]` in `src/score/glossary.ts` (악보에 나온 순서, 중복 없음).
- [ ] 약 40개: 셈여림(ppp~fff, mp, mf, sf, sfz, fp), 크레셴도·디크레셴도(wedge), cresc./dim./rit./rall./accel./a tempo/molto/poco/subito(words), 페르마타, 스타카토, 악센트, 테누토, 숨표(breath-mark), 도돌이표, 1·2번 괄호, D.C., D.S., 세뇨, 코다, Fine, 붙임줄, 이음줄, 빠르기말(Largo, Adagio, Andante, Moderato, Allegro, Presto).
- [ ] 테스트: 작은 XML에 `<dynamics><mf/></dynamics>`, `<wedge type="crescendo"/>`, `<fermata/>`, `<words>rit.</words>`, `<repeat direction="backward"/>`, `<words>Presto</words>` → 6개, 순서대로. 모르는 `<words>gently</words>`는 결과에 없음.
- [ ] 커밋 `feat: glossary of musical markings`

### Task 6: 곡 목록과 곡 불러오기

**Interfaces:** `public/songs/index.json` = `[{ id, title, file }]`; `loadSong(id: string): Promise<{ title: string; xml: string }>` in `src/songs/loadSong.ts` (`id === "imported"`이면 sessionStorage `ainos:imported`에서). `rememberPart(songId, partId)`, `recallPart(songId)` in `src/songs/myPart.ts` (localStorage, 예외 시 무시).
- [ ] 예제 곡 1개: 4성부 I–IV–V–I 연습곡(‘연습용 예제’라고 표시, 실제 찬양곡 아님).
- [ ] 홈(`/`)에 곡 목록. 가져오기 화면에 "이 곡으로 연습하기" 버튼(sessionStorage에 xml 저장 후 `/songs/imported`).
- [ ] 테스트: myPart가 localStorage 예외에서도 throw하지 않음, recall 없으면 undefined. loadSong은 fetch 주입으로 index → 파일 순서 확인, 없는 id면 Error('곡을 찾을 수 없어요').
- [ ] 커밋 `feat: song list and loading`

### Task 7: 연습 화면

- [ ] `/songs/[id]`: 상단 파트 고르기(역할 라벨 + 이름 버튼 줄, 처음엔 기억한 파트 또는 안내), 악보(꾸민 XML), 하단 고정 재생바(재생/정지, 빠르기, 구간 반복 시작·끝 마디 선택, 반복 켜기), 파트별 음량(접기), 토글 "계이름 표시", "이 곡의 기호" 칩 목록 → 누르면 아래 시트에 설명. 악보에서 음표 누르면 그 음을 소리 내고 "솔 (G4)" 표시. 재생 중 현재 마디로 OSMD 커서 이동.
- [ ] e2e(390×844): 예제 곡 열기 → 파트 4개 버튼, 알토 선택 → 알토 이외 음표가 회색(svg에 회색 fill 존재), 계이름 켜기 → 악보에 '도' 텍스트, 기호 칩 하나 누르면 설명 보임, 음표 클릭 → "(" 포함 음 이름 표시. 새로고침 후 알토가 선택된 채로 열림.
- [ ] 커밋 `feat: practice screen`
