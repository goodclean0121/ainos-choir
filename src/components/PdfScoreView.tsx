"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { canvasPixelRatio, fitScale, pagesPerScreen, pdfBytes } from "@/pdf/fit";
import { setupPdfWorker } from "@/pdf/worker";
import { pageAt, stepZoom, tapTurn, type Turn } from "@/score/paging";

const ZOOM_KEY = "ainos:pdf-zoom";
const MAX_ZOOM = 2;
const MOVE_SLOP = 10;

function recallZoom(): number {
  try {
    const z = Number(localStorage.getItem(ZOOM_KEY));
    return z >= 1 && z <= MAX_ZOOM ? z : 1;
  } catch {
    return 1;
  }
}

function rememberZoom(z: number) {
  try {
    localStorage.setItem(ZOOM_KEY, String(z));
  } catch {
    // Private windows can refuse storage; the zoom then lasts only for this visit.
  }
}

type PageSize = { width: number; height: number };

/**
 * A PDF score shown one page per screen. Swipe to turn a page; tap the left or right third
 * to jump to the first or last page.
 * 100% fits the whole page, larger sizes scroll inside the page.
 * Give each score its own `key`, so switching songs starts from a fresh first page.
 */
export function PdfScoreView({ src, title }: { src: string; title: string }) {
  const stripRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  const drawn = useRef(new WeakMap<HTMLCanvasElement, number>());
  const tasks = useRef<Map<number, RenderTask>>(new Map());
  const [sizes, setSizes] = useState<PageSize[]>([]);
  const [box, setBox] = useState<PageSize>({ width: 0, height: 0 });
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string>();

  // Load the document and read every page's size, so the strip can be laid out before drawing.
  useEffect(() => {
    let cancelled = false;
    let loading: { destroy(): Promise<void> } | undefined;
    const running = tasks.current;
    (async () => {
      const pdfjs = await import("pdfjs-dist");
      await setupPdfWorker(pdfjs);
      const data = await pdfBytes(src);
      if (cancelled) return;
      const task = pdfjs.getDocument({ data });
      loading = task;
      const doc = await task.promise;
      if (cancelled) return;
      docRef.current = doc;
      const found: PageSize[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const vp = (await doc.getPage(i)).getViewport({ scale: 1 });
        found.push({ width: vp.width, height: vp.height });
      }
      if (cancelled) return;
      setZoom(recallZoom());
      setSizes(found);
    })().catch((e: unknown) => {
      if (!cancelled) setError(e instanceof Error ? e.message : "악보를 열지 못했어요");
    });
    return () => {
      cancelled = true;
      running.forEach((t) => t.cancel());
      running.clear();
      docRef.current = null;
      void loading?.destroy();
    };
  }, [src]);

  // The page box follows the screen: rotating an iPad refits every page.
  useLayoutEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const measure = () => setBox({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Keep the same page in view when the box size changes.
  const perScreen = pagesPerScreen(box, zoom);
  // Each page fits half the screen in a two-page spread, minus a gutter.
  const slot = perScreen === 2 ? { width: box.width / 2 - 12, height: box.height - 16 } : box;
  const firstPage = useRef(0);

  // Keep the same page in view when the box size or the pages per screen change.
  useLayoutEffect(() => {
    const screen = Math.floor(firstPage.current / perScreen);
    setPage(screen);
    stripRef.current?.scrollTo({ left: screen * box.width });
  }, [box.width, perScreen]);

  const draw = useCallback(
    async (index: number) => {
      const doc = docRef.current;
      const canvas = canvases.current[index];
      const size = sizes[index];
      if (!doc || !canvas || !size) return;
      const scale = fitScale(size, slot, perScreen === 2 ? 1 : zoom);
      if (scale <= 0 || drawn.current.get(canvas) === scale) return;
      tasks.current.get(index)?.cancel();
      const pdfPage = await doc.getPage(index + 1);
      const cssW = size.width * scale;
      const cssH = size.height * scale;
      const ratio = canvasPixelRatio(cssW, cssH, window.devicePixelRatio || 1);
      const viewport = pdfPage.getViewport({ scale: scale * ratio });
      // Draw off-screen first so the old picture stays up until the new one is ready.
      const work = document.createElement("canvas");
      work.width = Math.floor(viewport.width);
      work.height = Math.floor(viewport.height);
      const task = pdfPage.render({ canvas: work, viewport });
      tasks.current.set(index, task);
      try {
        await task.promise;
      } catch {
        return; // Cancelled by a newer draw.
      }
      if (tasks.current.get(index) !== task || !canvas.isConnected) return;
      tasks.current.delete(index);
      canvas.width = work.width;
      canvas.height = work.height;
      canvas.getContext("2d")?.drawImage(work, 0, 0);
      drawn.current.set(canvas, scale);
    },
    // `slot` is derived from box and zoom.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sizes, box, zoom],
  );

  // Draw the page in view and its neighbours, so a swipe never lands on a blank page.
  useEffect(() => {
    const from = (page - 1) * perScreen;
    for (let i = page * perScreen; i < (page + 2) * perScreen; i++) if (i < sizes.length) void draw(i);
    for (let i = Math.max(0, from); i < page * perScreen; i++) void draw(i);
  }, [page, perScreen, sizes, draw]);

  const pages = sizes.length;
  const screens = Math.ceil(pages / perScreen);
  const shown = Array.from({ length: screens }, (_, i) => sizes.slice(i * perScreen, (i + 1) * perScreen));

  function goTo(target: number, smooth = true) {
    const el = stripRef.current;
    if (!el || target < 0 || target >= screens) return;
    el.scrollTo({ left: target * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
  }

  function turn(action: Turn) {
    if (action === "prev") goTo(page - 1);
    if (action === "next") goTo(page + 1);
    if (action === "first" || action === "last") {
      const target = action === "first" ? 0 : screens - 1;
      if (target === page) return;
      goTo(target, false);
      setJumped(action === "first" ? "첫 쪽" : "마지막 쪽");
      window.clearTimeout(jumpTimer.current);
      jumpTimer.current = window.setTimeout(() => setJumped(undefined), 1200);
    }
  }

  // A tap on the left or right third jumps to the first or last page. A drag is a swipe, not a tap.
  const press = useRef<{ x: number; y: number; moved: boolean }>(undefined);
  const jumpTimer = useRef<number>(undefined);
  const [jumped, setJumped] = useState<string>();

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || screens < 2) return;
    press.current = { x: e.clientX, y: e.clientY, moved: false };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const state = press.current;
    if (state && Math.hypot(e.clientX - state.x, e.clientY - state.y) > MOVE_SLOP) state.moved = true;
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const state = press.current;
    press.current = undefined;
    if (!state || state.moved) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const action = tapTurn(e.clientX - rect.left, rect.width);
    if (action) turn(action);
  }

  function onPointerCancel() {
    press.current = undefined;
  }

  function changeZoom(direction: 1 | -1) {
    const next = Math.min(MAX_ZOOM, Math.max(1, stepZoom(zoom, direction)));
    setZoom(next);
    rememberZoom(next);
  }

  const first = page * perScreen + 1;
  const last = Math.min(pages, first + perScreen - 1);

  return (
    <section className="score-paged pdf-score" aria-label={`${title} 악보`}>
      <div className="score-toolbar">
        <span className="pager-count" aria-live="polite">
          {pages > 0 ? `${first === last ? first : `${first}–${last}`} / ${pages} 쪽` : ""}
        </span>
        <div className="zoomer" role="group" aria-label="악보 크기">
          <button type="button" aria-label="작게" onClick={() => changeZoom(-1)} disabled={zoom <= 1}>
            −
          </button>
          <span className="zoom-value">{zoom === 1 ? "맞춤" : `${Math.round(zoom * 100)}%`}</span>
          <button type="button" aria-label="크게" onClick={() => changeZoom(1)} disabled={zoom >= MAX_ZOOM}>
            +
          </button>
        </div>
      </div>

      <div
        ref={stripRef}
        className="score score-pages pdf-pages"
        data-testid="pdf-score"
        tabIndex={0}
        onScroll={(e) => {
          const screen = pageAt(e.currentTarget.scrollLeft, e.currentTarget.clientWidth, screens);
          firstPage.current = screen * perScreen;
          setPage(screen);
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onKeyDown={(e) => {
          const keys: Record<string, Turn> = { ArrowLeft: "prev", ArrowRight: "next", Home: "first", End: "last" };
          const action = keys[e.key];
          if (action) {
            e.preventDefault();
            turn(action);
          }
        }}
      >
        {shown.map((group, screen) => (
          <div key={screen} className="pdf-page">
            {group.map((size, j) => {
              const i = screen * perScreen + j;
              const scale = fitScale(size, slot, perScreen === 2 ? 1 : zoom);
              return (
                <canvas
                  key={i}
                  aria-label={`${i + 1}쪽`}
                  role="img"
                  ref={(c) => {
                    canvases.current[i] = c;
                  }}
                  style={{ width: size.width * scale, height: size.height * scale }}
                />
              );
            })}
          </div>
        ))}
      </div>

      {pages === 0 && !error && (
        <p className="pdf-status" role="status">
          악보를 펼치고 있어요…
        </p>
      )}
      {error && <p className="notice notice-error pdf-status">{error}</p>}

      {jumped && (
        <p className="jump-toast" role="status">
          {jumped}
        </p>
      )}
    </section>
  );
}
