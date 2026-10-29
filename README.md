# 아이노스 찬양연습

아이노스 합창단 단원이 자기 파트의 음을 혼자서도 정확히 익힐 수 있게 돕는 웹앱입니다.
지금 들어 있는 것은 첫 단계인 **악보 가져오기** 화면(`/import`)입니다.

## 실행

```bash
npm install
npm run dev            # http://localhost:3000/import
```

MusicXML(.musicxml, .xml, .mxl)은 변환 서버 없이 브라우저에서 바로 읽습니다.
그 밖의 형식을 받으려면 변환 서버를 띄우고 주소를 알려 주세요.

```bash
docker build -t ainos-converter converter/
docker run -p 8787:8787 -e ALLOWED_ORIGIN=http://localhost:3000 ainos-converter
NEXT_PUBLIC_CONVERTER_URL=http://localhost:8787 npm run dev
```

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
- 반복 기호는 도돌이표와 1·2번 괄호까지 펼칩니다. D.S., D.C., 코다는 아직 펼치지 않고 적힌 순서대로 재생합니다.
- 재생 음색은 기본 신시사이저입니다. 피아노 음색은 다음 단계에서 바꿉니다.
