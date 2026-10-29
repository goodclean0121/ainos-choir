import type { MeasureMarks } from "./types";

const MAX_PLAYED = 10_000;

/** Return measure numbers in the order they are played, following repeat barlines and voltas. */
export function expandRepeats(marks: MeasureMarks[]): number[] {
  const order: number[] = [];
  const repeated = new Set<number>();
  let start = 0;
  let pass = 1;
  let jumped = false;
  let prevEnding = false;

  for (let i = 0; i < marks.length && order.length < MAX_PLAYED; ) {
    const m = marks[i];
    if (m.forward) {
      if (!jumped) {
        start = i;
        pass = 1;
      }
      jumped = false;
    } else if (!m.endings && prevEnding) {
      // Left a volta section: the next repeated section starts fresh.
      pass = 1;
      start = i;
    }

    if (m.endings && !m.endings.includes(pass)) {
      i++;
      continue;
    }

    order.push(m.number);
    prevEnding = Boolean(m.endings);

    if (m.backward && !repeated.has(i)) {
      repeated.add(i);
      pass++;
      jumped = true;
      i = start;
      continue;
    }
    if (m.backward) {
      pass = 1;
      start = i + 1;
    }
    i++;
  }
  return order;
}
