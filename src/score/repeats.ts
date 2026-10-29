import type { MeasureMarks } from "./types";

const MAX_PLAYED = 10_000;

/** Highest ending number in the run of volta measures that starts at or after index i. */
function lastEnding(marks: MeasureMarks[], i: number): number {
  let max = 0;
  for (let j = i; j < marks.length && marks[j].endings; j++) max = Math.max(max, ...marks[j].endings!);
  return max;
}

/** Return measure numbers in the order they are played, following repeat barlines and voltas. */
export function expandRepeats(marks: MeasureMarks[]): number[] {
  const order: number[] = [];
  const jumpsTaken = new Map<number, number>();
  let start = 0;
  let pass = 1;
  let arrivedByJump = false;

  for (let i = 0; i < marks.length && order.length < MAX_PLAYED; ) {
    const m = marks[i];
    if (m.forward && !arrivedByJump) {
      start = i;
      pass = 1;
    }
    arrivedByJump = false;

    const plays = !m.endings || m.endings.includes(pass);
    if (plays) order.push(m.number);

    if (plays && m.backward) {
      const taken = jumpsTaken.get(i) ?? 0;
      const again = m.endings ? pass < lastEnding(marks, i) : taken + 1 < (m.times ?? 2);
      if (again) {
        jumpsTaken.set(i, taken + 1);
        pass++;
        arrivedByJump = true;
        i = start;
        continue;
      }
      jumpsTaken.delete(i);
      pass = 1;
      start = i + 1;
    } else if (m.endings && !marks[i + 1]?.endings) {
      // Last volta measure: the next repeated section starts fresh.
      pass = 1;
      start = i + 1;
    }
    i++;
  }
  return order;
}
