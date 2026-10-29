import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const instances: { load: ReturnType<typeof vi.fn>; options: Record<string, unknown> }[] = [];

vi.mock("opensheetmusicdisplay", () => ({
  OpenSheetMusicDisplay: class {
    load = vi.fn(async () => {});
    render = vi.fn();
    setOptions = vi.fn((o: Record<string, unknown>) => Object.assign(this.options, o));
    options: Record<string, unknown>;
    cursor = { hide: vi.fn(), show: vi.fn(), reset: vi.fn(), next: vi.fn(), hidden: true, iterator: { CurrentMeasureIndex: 0, EndReached: true } };
    constructor(_el: unknown, options: Record<string, unknown>) {
      this.options = { ...options };
      instances.push(this as never);
    }
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  instances.length = 0;
  document.body.innerHTML = "";
});

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

describe("ScoreView", () => {
  it("reuses one score drawer when the score changes", async () => {
    const { ScoreView } = await import("@/components/ScoreView");
    const el = document.createElement("div");
    document.body.append(el);
    const root = createRoot(el);
    await act(async () => root.render(createElement(ScoreView, { xml: "<a/>" })));
    await flush();
    await act(async () => root.render(createElement(ScoreView, { xml: "<b/>" })));
    await flush();
    expect(instances).toHaveLength(1);
    expect(instances[0].load.mock.calls.map((c) => c[0])).toEqual(["<a/>", "<b/>"]);
    await act(async () => root.unmount());
    // stop listening for window resizes once the score is gone
    expect(instances[0].options.autoResize).toBe(false);
  });
});
