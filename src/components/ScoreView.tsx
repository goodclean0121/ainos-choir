"use client";

import { useEffect, useRef, useState } from "react";
import type { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import type { NotePitch } from "@/score/noteName";

export interface TappedNote extends NotePitch {
  /** 1-based measure in written order. */
  measure: number;
}

interface Props {
  xml: string;
  /** Called when a note is tapped; when given, the score becomes tappable. */
  onNoteTap?(note: TappedNote): void;
  /** 1-based written measure to show the cursor at, or null to hide it. */
  cursorMeasure?: number | null;
}

const STEP_BY_SEMITONE: Record<number, string> = { 0: "C", 2: "D", 4: "E", 5: "F", 7: "G", 9: "A", 11: "B" };
/** OSMD counts octaves 3 lower than MusicXML (its octave 1 is MusicXML's 4). */
const OSMD_OCTAVE_OFFSET = 3;

/** Draws a MusicXML score with OpenSheetMusicDisplay. */
export function ScoreView({ xml, onNoteTap, cursorMeasure = null }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const [error, setError] = useState<string>();
  const [rendered, setRendered] = useState(0);
  const tapRef = useRef(onNoteTap);

  useEffect(() => {
    tapRef.current = onNoteTap;
  }, [onNoteTap]);

  useEffect(() => {
    let cancelled = false;
    const el = container.current;
    if (!el) return;
    (async () => {
      const { OpenSheetMusicDisplay } = await import("opensheetmusicdisplay");
      if (cancelled) return;
      el.innerHTML = "";
      const osmd = new OpenSheetMusicDisplay(el, {
        autoResize: true,
        backend: "svg",
        drawTitle: true,
        followCursor: true,
        cursorsOptions: [{ type: 3, color: "#1f5566", alpha: 0.12, follow: true }],
      });
      try {
        await osmd.load(xml);
        if (cancelled) return;
        osmd.render();
        osmdRef.current = osmd;
        setError(undefined);
        setRendered((n) => n + 1);
      } catch {
        if (!cancelled) setError("악보를 화면에 그리지 못했어요. 듣기는 그대로 쓸 수 있어요.");
      }
    })();
    return () => {
      cancelled = true;
      osmdRef.current = null;
    };
  }, [xml]);

  // Move the cursor (a shaded measure) to the measure being played.
  useEffect(() => {
    const osmd = osmdRef.current;
    if (!osmd || !rendered) return;
    const cursor = osmd.cursor;
    if (cursorMeasure == null) {
      cursor.hide();
      return;
    }
    if (cursor.iterator.CurrentMeasureIndex > cursorMeasure - 1 || cursor.hidden) cursor.reset();
    while (!cursor.iterator.EndReached && cursor.iterator.CurrentMeasureIndex < cursorMeasure - 1) cursor.next();
    cursor.show();
  }, [cursorMeasure, rendered]);

  async function handleClick(e: React.MouseEvent) {
    const osmd = osmdRef.current;
    if (!osmd || !tapRef.current) return;
    const { PointF2D } = await import("opensheetmusicdisplay");
    const sheet = osmd.GraphicSheet;
    const point = sheet.svgToOsmd(sheet.domToSvg(new PointF2D(e.clientX, e.clientY)));
    const graphical = sheet.GetNearestNote(point, new PointF2D(2.5, 3));
    const note = graphical?.sourceNote;
    if (!note || note.isRest() || !note.Pitch) return;
    const pitch = note.Pitch;
    tapRef.current({
      step: STEP_BY_SEMITONE[pitch.FundamentalNote],
      alter: pitch.AccidentalHalfTones,
      octave: pitch.Octave + OSMD_OCTAVE_OFFSET,
      measure: note.SourceMeasure.measureListIndex + 1,
    });
  }

  return (
    <section aria-label="악보">
      {error && <p className="notice notice-error">{error}</p>}
      <div
        ref={container}
        className={onNoteTap ? "score score-tappable" : "score"}
        data-testid="score"
        onClick={onNoteTap ? handleClick : undefined}
      />
    </section>
  );
}
