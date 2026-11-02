import { dayKey, type Rehearsal } from "@/schedule/calendar";

/**
 * Example events for the trial, placed around today so every screen has something to show:
 * Wednesday evening practices and Sunday performances for the next few weeks.
 */
export function sampleRehearsals(scoreIds: string[], today = new Date()): Rehearsal[] {
  const [wonderful, example] = scoreIds;
  const at = (offset: number) => dayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset));
  const sunday = (weeks: number) => at(((7 - today.getDay()) % 7) + weeks * 7);
  const wednesday = (weeks: number) => at(((10 - today.getDay()) % 7) + weeks * 7);
  const place = "본당 2층 연습실";
  return [
    {
      date: wednesday(0),
      kind: "practice",
      time: "저녁 8:00",
      place,
      title: "수요 파트 연습",
      songs: [
        { title: "A Wonderful Time Up There", note: "113마디부터 끝까지", scoreId: wonderful },
        { title: "연습용 예제 (4성부 화음)", note: "화음 맞추기", scoreId: example },
      ],
    },
    {
      date: wednesday(1),
      kind: "practice",
      time: "저녁 8:00",
      place,
      title: "수요 전체 연습",
      songs: [{ title: "A Wonderful Time Up There", note: "처음부터 끝까지", scoreId: wonderful }],
    },
    {
      date: sunday(0),
      kind: "performance",
      time: "오전 11:00",
      place: "본당",
      title: "주일 2부 예배 찬양",
      dress: "검정 정장, 흰 셔츠",
      gather: "오전 9:30 연습실",
      songs: [
        { title: "A Wonderful Time Up There", note: "암보", scoreId: wonderful },
        { title: "연습용 예제 (4성부 화음)", scoreId: example },
      ],
    },
    {
      date: sunday(1),
      kind: "performance",
      time: "오전 11:00",
      place: "본당",
      title: "주일 2부 예배 찬양",
      songs: [{ title: "연습용 예제 (4성부 화음)", scoreId: example }],
    },
  ];
}
