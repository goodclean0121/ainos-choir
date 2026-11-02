declare module "*?raw" { const text: string; export default text; }
/// <reference types="vite/client" />

declare module "pdfjs-dist/build/pdf.worker.min.mjs" {
  export const WorkerMessageHandler: unknown;
}
