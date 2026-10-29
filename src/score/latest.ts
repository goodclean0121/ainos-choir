/** Tracks the newest of several overlapping requests, so a slow older one cannot overwrite a newer result. */
export function createLatest() {
  let current: AbortController | null = null;

  function begin() {
    current?.abort();
    const controller = new AbortController();
    current = controller;
    return { signal: controller.signal, isCurrent: () => current === controller };
  }

  function cancel() {
    current?.abort();
    current = null;
  }

  return { begin, cancel };
}
