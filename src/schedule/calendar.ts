export type RehearsalSong = { title: string; note?: string; scoreId?: string };
export type Rehearsal = { date: string; title: string; time?: string; songs: RehearsalSong[] };
export type CalendarDay = { key: string; day: number; inMonth: boolean };

/** A local date as "YYYY-MM-DD", the key rehearsals are filed under. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** The weeks of a month (month is 0-based), Sunday first, padded with days from the months around it. */
export function monthGrid(year: number, month: number): CalendarDay[][] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weekCount = Math.ceil((first.getDay() + daysInMonth) / 7);
  return Array.from({ length: weekCount }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d);
      return { key: dayKey(date), day: date.getDate(), inMonth: date.getMonth() === month };
    }),
  );
}

/** The first rehearsal on or after `today`. */
export function nextRehearsal(list: Rehearsal[], today: string): Rehearsal | undefined {
  return [...list].filter((r) => r.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
}
