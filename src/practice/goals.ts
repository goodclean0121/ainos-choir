import { dayKey } from "@/schedule/calendar";

/** The two goals each song of the week gets in personal practice. */
export const GOALS = [
  { id: "notes", label: "내 파트 음 익히기" },
  { id: "words", label: "가사 붙여 부르기" },
] as const;

/** A week is named by its Sunday, so goals start fresh every week. */
export function weekOf(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return dayKey(new Date(y, m - 1, d - date.getDay()));
}

export function goalId(week: string, song: string, goal: string): string {
  return `${week}|${song}|${goal}`;
}

/** How far a song is this week: the share of its goals ticked, 0 to 1. */
export function songProgress(ticks: Set<string>, week: string, song: string): number {
  return GOALS.filter((g) => ticks.has(goalId(week, song, g.id))).length / GOALS.length;
}
