type PdfJs = typeof import("pdfjs-dist");

/** Points pdf.js at its worker, which reads PDFs off the main thread. */
export async function setupPdfWorker(pdfjs: PdfJs): Promise<void> {
  if (pdfjs.GlobalWorkerOptions.workerPort) return;
  pdfjs.GlobalWorkerOptions.workerPort = new Worker(
    new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
    { type: "module" },
  );
}
