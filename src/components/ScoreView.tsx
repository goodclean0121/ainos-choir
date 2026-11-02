"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import type { NotePitch } from "@/score/noteName";
import { defaultZoom, fitZoom, pageAt, stepZoom, ZOOM_STEPS } from "@/score/paging";

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
  /** Fit the score to screen-sized pages that are swiped left and right, with zoom buttons. */
  paged?: boolean;
  /** Extra controls shown at the start of the paged toolbar. */
  toolbarStart?: React.ReactNode;
}

const STEP_BY_SEMITONE: Record<number, string> = { 0: "C", 2: "D", 4: "E", 5: "F", 7: "G", 9: "A", 11: "B" };
/** OSMD counts octaves 3 lower than MusicXML (its octave 1 is MusicXML's 4). */
const OSMD_OCTAVE_OFFSET = 3;
const ZOOM_KEY = "ainos:zoom";

function recallZoom(): number | undefined {
  try {
    const z = Number(localStorage.getItem(ZOOM_KEY));
    return ZOOM_STEPS.includes(z) ? z : undefined;
  } catch {
    return undefined;
  }
}

function rememberZoom(z: number) {
  try {
    localStorage.setItem(ZOOM_KEY, String(z));
  } catch {
    // private mode: the size just isn't remembered
  }
}

/** Height in pixels the tallest page needs at zoom `z`, top margin to the last system's bottom. */
function contentHeight(osmd: OpenSheetMusicDisplay, z: number): number {
  let bottom = 0;
  for (const page of osmd.GraphicSheet.MusicPages) {
    for (const system of page.MusicSystems) {
      const box = system.PositionAndShape;
      bottom = Math.max(bottom, box.RelativePosition.y + box.BorderMarginBottom);
    }
  }
  return (bottom + osmd.EngravingRules.PageBottomMargin) * 10 * z;
}

/** Draws a MusicXML score with OpenSheetMusicDisplay. */
export function ScoreView({ xml, onNoteTap, cursorMeasure = null, paged = false, toolbarStart }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const osmdModule = useRef<typeof import("opensheetmusicdisplay") | null>(null);
  const [error, setError] = useState<string>();
  const [rendered, setRendered] = useState(0);
  const [zoom, setZoom] = useState<number>();
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const pagesRef = useRef(1);
  const tapRef = useRef(onNoteTap);

  useEffect(() => {
    tapRef.current = onNoteTap;
  }, [onNoteTap]);

  // One drawer per mount: OSMD never removes its window resize listener, so a new
  // instance per score change would leave old ones redrawing on every resize.
  const drawer = useRef<Promise<OpenSheetMusicDisplay> | null>(null);
  useEffect(() => {
    const el = container.current;
    return () => {
      void drawer.current?.then((osmd) => osmd.setOptions({ autoResize: false }));
      drawer.current = null;
      if (el) el.innerHTML = "";
    };
  }, []);

  /**
   * Lays the loaded score out again, as pages the size of the box when paged. A system taller
   * than the box (many parts, or zoomed in) gets a taller page that scrolls up and down.
   */
  const layout = useCallback(
    (osmd: OpenSheetMusicDisplay, el: HTMLElement, z: number) => {
      // Where we were, as a share of the score, so a re-layout keeps roughly the same music in view.
      const before = pagesRef.current > 1 ? pageAt(el.scrollLeft, el.clientWidth, pagesRef.current) / pagesRef.current : 0;
      osmd.zoom = z;
      if (paged) osmd.setCustomPageFormat(el.clientWidth, el.clientHeight);
      osmd.render();
      if (!paged) return;
      const needed = contentHeight(osmd, z);
      if (needed > el.clientHeight + 1) {
        osmd.setCustomPageFormat(el.clientWidth, needed);
        osmd.render();
      }
      const count = Math.max(1, osmd.GraphicSheet.MusicPages.length);
      const target = Math.min(count - 1, Math.round(before * count));
      pagesRef.current = count;
      setPages(count);
      setPage(target);
      el.scrollTo({ left: target * el.clientWidth });
    },
    [paged],
  );

  const zoomRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    let cancelled = false;
    const el = container.current;
    if (!el) return;
    drawer.current ??= import("opensheetmusicdisplay").then((mod) => {
      osmdModule.current = mod;
      return new mod.OpenSheetMusicDisplay(el, {
        autoResize: !paged,
        backend: "svg",
        drawTitle: false,
        followCursor: !paged,
        cursorsOptions: [{ type: 3, color: "#1f5566", alpha: 0.12, follow: !paged }],
      });
    });
    const pending = drawer.current;
    (async () => {
      const osmd = await pending;
      if (cancelled) return;
      osmdRef.current = null;
      try {
        await osmd.load(xml);
        if (cancelled) return;
        let z = zoomRef.current ?? (paged ? recallZoom() : undefined);
        if (z === undefined) {
          z = defaultZoom(el.clientWidth);
          if (paged) {
            // Start at a size where a whole system fits on the screen.
            osmd.zoom = z;
            osmd.setCustomPageFormat(el.clientWidth, el.clientHeight);
            osmd.render();
            z = fitZoom(z, el.clientHeight, contentHeight(osmd, z));
          }
        }
        layout(osmd, el, z);
        osmdRef.current = osmd;
        setZoom(z);
        setError(undefined);
        setRendered((n) => n + 1);
      } catch {
        if (!cancelled) setError("악보를 화면에 그리지 못했어요. 듣기는 그대로 쓸 수 있어요.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [xml, paged, layout]);

  // Paged scores are laid out again when the box changes size (rotating a tablet).
  useEffect(() => {
    const el = container.current;
    if (!paged || !el || typeof ResizeObserver === "undefined") return;
    let size = `${el.clientWidth}x${el.clientHeight}`;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new ResizeObserver(() => {
      const next = `${el.clientWidth}x${el.clientHeight}`;
      if (next === size) return;
      size = next;
      clearTimeout(timer);
      timer = setTimeout(() => {
        const osmd = osmdRef.current;
        if (osmd && zoomRef.current) layout(osmd, el, zoomRef.current);
        setRendered((n) => n + 1);
      }, 150);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [paged, layout]);

  function changeZoom(direction: 1 | -1) {
    const osmd = osmdRef.current;
    const el = container.current;
    if (!osmd || !el || zoom === undefined) return;
    const next = stepZoom(zoom, direction);
    if (next === zoom) return;
    setZoom(next);
    rememberZoom(next);
    layout(osmd, el, next);
    setRendered((n) => n + 1);
  }

  function goTo(target: number) {
    const el = container.current;
    if (!el) return;
    const p = Math.min(pages - 1, Math.max(0, target));
    el.scrollTo({ left: p * el.clientWidth, behavior: "smooth" });
    setPage(p);
  }

  // Move the cursor (a shaded measure) to the measure being played, turning the page to it.
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
    if (paged) {
      const sheet = osmd.GraphicSheet;
      const musicPage = sheet.MeasureList[cursorMeasure - 1]?.find((m) => m)?.ParentMusicSystem?.Parent;
      const index = musicPage ? sheet.MusicPages.indexOf(musicPage) : -1;
      const el = container.current;
      if (index >= 0 && el && pageAt(el.scrollLeft, el.clientWidth, pages) !== index) {
        el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
        setPage(index);
      }
    }
    // pages only matters for the page-turn check
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursorMeasure, rendered, paged]);

  // Synchronous on purpose: iOS only allows sound to start inside the tap itself.
  function handleClick(e: React.MouseEvent) {
    const osmd = osmdRef.current;
    const el = container.current;
    if (!osmd || !el || !tapRef.current || !osmdModule.current) return;
    const { PointF2D } = osmdModule.current;
    const sheet = osmd.GraphicSheet;
    // Each page is its own SVG with its own coordinates: find the one that was tapped.
    const svgs = Array.from(el.querySelectorAll("svg"));
    const index = Math.max(0, svgs.findIndex((s) => s.contains(e.target as Node)));
    const svg = svgs[index];
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return;
    const local = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    const point = sheet.svgToOsmd(new PointF2D(local.x, local.y));
    const graphical = sheet.GetNearestNote(point, new PointF2D(2.5, 3), sheet.MusicPages[index]);
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

  const classes = ["score", paged && "score-pages", onNoteTap && "score-tappable"].filter(Boolean).join(" ");
  return (
    <section aria-label="악보" className={paged ? "score-paged" : undefined}>
      {error && <p className="notice notice-error">{error}</p>}
      {paged && (
        <div className="score-toolbar">
          {toolbarStart}
          <span className="pager-count" aria-live="polite">
            {page + 1} / {pages} 쪽
          </span>
          <div className="zoomer" role="group" aria-label="악보 크기">
            <button type="button" aria-label="작게" disabled={zoom === ZOOM_STEPS[0]} onClick={() => changeZoom(-1)}>
              <span aria-hidden="true">−</span>
            </button>
            <span className="zoom-value">{zoom ? `${Math.round(zoom * 100)}%` : ""}</span>
            <button type="button" aria-label="크게" disabled={zoom === ZOOM_STEPS.at(-1)} onClick={() => changeZoom(1)}>
              <span aria-hidden="true">+</span>
            </button>
          </div>
        </div>
      )}
      <div
        ref={container}
        className={classes}
        data-testid="score"
        onClick={onNoteTap ? handleClick : undefined}
        onScroll={
          paged
            ? (e) => setPage(pageAt(e.currentTarget.scrollLeft, e.currentTarget.clientWidth, pages))
            : undefined
        }
        onKeyDown={
          paged
            ? (e) => {
                if (e.key === "ArrowRight") goTo(page + 1);
                if (e.key === "ArrowLeft") goTo(page - 1);
              }
            : undefined
        }
        tabIndex={paged ? 0 : undefined}
      />
      {paged && pages > 1 && (
        <>
          {/* Tap the left or right edge to turn the page, as with a paper score. */}
          <button
            type="button"
            className="page-edge page-edge-prev"
            aria-label="이전 쪽"
            disabled={page <= 0}
            onClick={() => goTo(page - 1)}
          >
            <span aria-hidden="true">‹</span>
          </button>
          <button
            type="button"
            className="page-edge page-edge-next"
            aria-label="다음 쪽"
            disabled={page >= pages - 1}
            onClick={() => goTo(page + 1)}
          >
            <span aria-hidden="true">›</span>
          </button>
        </>
      )}
    </section>
  );
}
