type Size = { width: number; height: number };

/** The scale that shows the whole page inside the box, times the reader's zoom. */
export function fitScale(page: Size, box: Size, zoom = 1): number {
  if (box.width <= 0 || box.height <= 0 || page.width <= 0 || page.height <= 0) return 0;
  return Math.min(box.width / page.width, box.height / page.height) * zoom;
}

/** iPads refuse canvases past roughly 16M pixels, so big zooms draw at a lower pixel ratio. */
export function canvasPixelRatio(cssWidth: number, cssHeight: number, deviceRatio: number, budget = 12_000_000): number {
  const area = cssWidth * cssHeight;
  if (area <= 0) return deviceRatio;
  return Math.min(deviceRatio, Math.sqrt(budget / area));
}

/** The bytes of a PDF given as a data URL (the trial bundles them) or a normal URL. */
export async function pdfBytes(src: string, fetcher: (url: string) => Promise<Response> = fetch): Promise<Uint8Array> {
  const data = /^data:[^,]*;base64,(.*)$/.exec(src);
  if (data) return Uint8Array.from(atob(data[1]), (c) => c.charCodeAt(0));
  const res = await fetcher(src);
  if (!res.ok) throw new Error(`악보 파일을 받지 못했어요 (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
}

/** A landscape screen at the fitted size holds two pages, like an open book; zooming shows one. */
export function pagesPerScreen(box: Size, zoom: number): 1 | 2 {
  return zoom === 1 && box.width > box.height * 1.15 ? 2 : 1;
}
