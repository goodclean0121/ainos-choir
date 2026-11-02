"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const EVENT = "partnote:store";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Saves a value on this device only; private windows may refuse, and then it lasts for the visit. */
export function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage refused: nothing to keep.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function readStored<T>(key: string, fallback: T): T {
  const raw = read(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** A value kept on this device, shared by every component that reads the same key. */
export function useStored<T>(key: string, fallback: T): [T, (next: T) => void] {
  const raw = useSyncExternalStore(subscribe, () => read(key), () => null);
  const value = useMemo(() => {
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
    // `fallback` is a default, not an input that should re-parse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);
  const set = useCallback((next: T) => writeStored(key, next), [key]);
  return [value, set];
}

/** A set of ticked ids (goals done, songs memorised) kept on this device. */
export function useTicks(key: string): [Set<string>, (id: string) => void] {
  const [list, setList] = useStored<string[]>(key, []);
  const ticks = useMemo(() => new Set(list), [list]);
  const toggle = useCallback(
    (id: string) => setList(ticks.has(id) ? list.filter((x) => x !== id) : [...list, id]),
    [ticks, list, setList],
  );
  return [ticks, toggle];
}
