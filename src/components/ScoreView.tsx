"use client";

import { useEffect, useRef, useState } from "react";

/** Draws a MusicXML score with OpenSheetMusicDisplay. */
export function ScoreView({ xml }: { xml: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    const el = container.current;
    if (!el) return;
    (async () => {
      const { OpenSheetMusicDisplay } = await import("opensheetmusicdisplay");
      if (cancelled) return;
      el.innerHTML = "";
      const osmd = new OpenSheetMusicDisplay(el, { autoResize: true, backend: "svg", drawTitle: true });
      try {
        await osmd.load(xml);
        if (!cancelled) osmd.render();
      } catch {
        if (!cancelled) setError("악보를 화면에 그리지 못했어요. 파트 목록과 듣기는 그대로 쓸 수 있어요.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [xml]);

  return (
    <section aria-label="악보">
      {error && <p className="notice notice-error">{error}</p>}
      <div ref={container} className="score" data-testid="score" />
    </section>
  );
}
