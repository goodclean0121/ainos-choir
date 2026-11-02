import { dayKey } from "@/schedule/calendar";

/** Seconds practised per day, keyed "YYYY-MM-DD". */
export type PracticeLog = Record<string, number>;

export function addSeconds(log: PracticeLog, day: string, seconds: number): PracticeLog {
  return { ...log, [day]: (log[day] ?? 0) + seconds };
}

/** Seconds practised from Sunday to Saturday of the week holding `today`. */
export function weekSeconds(log: PracticeLog, today: string): number {
  const [y, m, d] = today.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  let total = 0;
  for (let i = 0; i < 7; i++) {
    total += log[dayKey(new Date(y, m - 1, d - date.getDay() + i))] ?? 0;
  }
  return total;
}
