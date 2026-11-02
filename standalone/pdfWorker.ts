type PdfJs = typeof import("pdfjs-dist");

/**
 * The one-file trial can't count on loading a worker (the page may forbid it), so pdf.js reads
 * PDFs on the main thread instead: it uses `globalThis.pdfjsWorker` when that is set.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- same signature as the app version
export async function setupPdfWorker(_pdfjs: PdfJs): Promise<void> {
  const g = globalThis as { pdfjsWorker?: unknown };
  g.pdfjsWorker ??= await import("pdfjs-dist/build/pdf.worker.min.mjs");
}
