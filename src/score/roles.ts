import type { PartInfo } from "./types";

const ROLE_PATTERNS: [string, RegExp][] = [
  ["S", /soprano|소프라노|^s\s*\d?$/i],
  ["A", /alto|알토|mezzo|메조|^a\s*\d?$/i],
  ["T", /tenor|테너|^t\s*\d?$/i],
  ["B", /bass|베이스|baritone|바리톤|^b\s*\d?$/i],
];

const DEFAULT_FOUR = ["S", "A", "T", "B"];
export const UNKNOWN_ROLE = "?";

function roleFromName(name: string): string | undefined {
  const trimmed = name.trim();
  const found = ROLE_PATTERNS.find(([, re]) => re.test(trimmed));
  if (!found) return undefined;
  const number = trimmed.match(/(\d)\s*$/)?.[1] ?? "";
  return found[0] + number;
}

/** Label each part with a choir role (S1, A, T2, B …) from its name; '?' means the admin should choose. */
export function assignRoles(parts: PartInfo[]): Record<string, string> {
  const named = parts.map((p) => roleFromName(p.name));
  const noneNamed = named.every((r) => r === undefined);
  return Object.fromEntries(
    parts.map((p, i) => [p.id, named[i] ?? (noneNamed && parts.length === 4 ? DEFAULT_FOUR[i] : UNKNOWN_ROLE)]),
  );
}
