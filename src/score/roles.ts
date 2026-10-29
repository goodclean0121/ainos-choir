import type { PartInfo } from "./types";

const FAMILY_WORDS: [string, string[]][] = [
  ["S", ["soprano", "sopran", "sop", "소프라노"]],
  ["A", ["contralto", "alto", "알토", "mezzo", "메조"]],
  ["T", ["tenor", "테너"]],
  ["B", ["baritone", "bass", "베이스", "바리톤"]],
];
const WORD_TO_FAMILY = new Map(FAMILY_WORDS.flatMap(([family, words]) => words.map((w) => [w, family] as const)));
const ROMAN: Record<string, string> = { i: "1", ii: "2", iii: "3", iv: "4" };

// A role word, a run of S/A/T/B letters ("SATB", "TB"), or one such letter, optionally numbered (1, 2, I, II).
const ROLE_RE = new RegExp(
  `(?<![a-z])(${[...WORD_TO_FAMILY.keys()].join("|")}|[satb]{1,4})(?![a-z])\\s*(iv|iii|ii|i|\\d)?(?![a-z0-9])`,
  "g",
);

const DEFAULT_FOUR = ["S", "A", "T", "B"];
export const UNKNOWN_ROLE = "?";

/** Every role a part name mentions, in order: "Soprano Alto" → ["S", "A"], "T. 1" → ["T1"]. */
function rolesInName(name: string): string[] {
  const text = name.toLowerCase().replace(/\./g, " ");
  const roles: string[] = [];
  for (const [, word, num] of text.matchAll(ROLE_RE)) {
    const number = num ? (ROMAN[num] ?? num) : "";
    const family = WORD_TO_FAMILY.get(word);
    if (family) roles.push(family + number);
    else for (const letter of word) roles.push(letter.toUpperCase() + (word.length === 1 ? number : ""));
  }
  return roles;
}

function rolesForLines(lines: PartInfo[]): (string | undefined)[] {
  const roles = rolesInName(lines[0].sourceName || lines[0].name);
  if (roles.length === 0) return lines.map(() => undefined);
  if (lines.length === 1) return [roles[0]];
  if (roles.length === lines.length) return roles;
  if (roles.length === 1) return lines.map((_, i) => (/\d$/.test(roles[0]) ? roles[0] : roles[0] + (i + 1)));
  return lines.map(() => UNKNOWN_ROLE);
}

/** Label each line with a choir role (S1, A, T2, B …) from its part name; '?' means the admin should choose. */
export function assignRoles(parts: PartInfo[]): Record<string, string> {
  const groups = new Map<string, PartInfo[]>();
  for (const p of parts) {
    const key = `${p.sourcePartId}\u0000${p.staff}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const named = new Map<string, string | undefined>();
  for (const lines of groups.values()) {
    rolesForLines(lines).forEach((role, i) => named.set(lines[i].id, role));
  }

  const noneNamed = [...named.values()].every((r) => r === undefined);
  return Object.fromEntries(
    parts.map((p, i) => [p.id, named.get(p.id) ?? (noneNamed && parts.length === 4 ? DEFAULT_FOUR[i] : UNKNOWN_ROLE)]),
  );
}
