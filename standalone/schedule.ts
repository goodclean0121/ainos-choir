import { dayKey, type Rehearsal } from "@/schedule/calendar";

/**
 * Example rehearsals for the trial, placed around today so the calendar always has something to show:
 * the coming Sundays and one Wednesday evening.
 */
export function sampleRehearsals(scoreIds: string[], today = new Date()): Rehearsal[] {
  const [wonderful, example] = scoreIds;
  const sunday = (weeks: number) =>
    dayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + ((7 - today.getDay()) % 7) + weeks * 7));
  const wednesday = dayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + ((10 - today.getDay()) % 7)));
  return [
    {
      date: sunday(0),
      time: "오전 9:30",
      title: "주일 2부 예배 찬양",
      songs: [
        { title: "A Wonderful Time Up There", note: "처음부터 끝까지, 빠르기 주의", scoreId: wonderful },
        { title: "연습용 예제 (4성부 화음)", note: "화음 맞추기", scoreId: example },
      ],
    },
    {
      date: wednesday,
      time: "저녁 8:00",
      title: "수요 파트 연습",
      songs: [{ title: "A Wonderful Time Up There", note: "113마디부터 마지막까지", scoreId: wonderful }],
    },
    {
      date: sunday(1),
      time: "오전 9:30",
      title: "주일 2부 예배 찬양",
      songs: [{ title: "연습용 예제 (4성부 화음)", scoreId: example }],
    },
    { date: sunday(2), time: "오전 9:30", title: "주일 2부 예배 찬양", songs: [] },
  ];
}
