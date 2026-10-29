import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { convert } from "./convert.mjs";

const FORMATS = { mscz: "musescore", mscx: "musescore", mid: "midi", midi: "midi", pdf: "pdf", png: "image", jpg: "image", jpeg: "image" };
const MAX_BYTES = 50 * 1024 * 1024;
const MAX_JOBS = Number(process.env.MAX_JOBS || 2);

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

const sendJson = (res, status, obj) => send(res, status, JSON.stringify(obj), { "content-type": "application/json; charset=utf-8" });

function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size <= maxBytes) chunks.push(chunk);
    });
    req.on("end", () => {
      if (size > maxBytes) reject(Object.assign(new Error("too large"), { status: 413 }));
      else resolve(Buffer.concat(chunks));
    });
    req.on("error", reject);
  });
}

export function createConverterServer({
  convertFn = convert,
  maxBytes = MAX_BYTES,
  maxJobs = MAX_JOBS,
  allowedOrigin = process.env.ALLOWED_ORIGIN || "*",
} = {}) {
  let running = 0;

  async function handle(req, res) {
    res.setHeader("access-control-allow-origin", allowedOrigin);
    res.setHeader("access-control-allow-methods", "POST, GET, OPTIONS");
    res.setHeader("access-control-allow-headers", "x-filename, content-type");
    res.setHeader("access-control-expose-headers", "x-experimental");

    if (req.method === "OPTIONS") return send(res, 204, "");
    if (req.method === "GET" && req.url === "/health") return send(res, 200, "ok");
    if (req.method !== "POST" || req.url !== "/convert") return sendJson(res, 404, { error: "없는 주소예요" });

    let filename;
    try {
      filename = decodeURIComponent(String(req.headers["x-filename"] ?? ""));
    } catch {
      req.resume();
      return sendJson(res, 400, { error: "파일 이름을 읽을 수 없어요" });
    }
    const ext = extname(filename).slice(1).toLowerCase();
    const format = FORMATS[ext];
    if (!format) {
      req.resume();
      return sendJson(res, 400, { error: `지원하지 않는 형식이에요(.${ext})` });
    }

    if (running >= maxJobs) {
      req.resume();
      return sendJson(res, 503, { error: "지금 변환하는 악보가 많아요. 잠시 후 다시 시도해 주세요." });
    }

    running++;
    let body;
    try {
      body = await readBody(req, maxBytes);
    } catch (err) {
      running--;
      return sendJson(res, err.status ?? 400, { error: "파일이 너무 커요(최대 50MB)" });
    }

    const inputPath = join(mkdtempSync(join(tmpdir(), "ainos-upload-")), `input.${ext}`);
    writeFileSync(inputPath, body);
    try {
      const { xmlPath, experimental, cleanup } = await convertFn(inputPath, format);
      try {
        const type = xmlPath.endsWith(".mxl") ? "application/vnd.recordare.musicxml" : "application/vnd.recordare.musicxml+xml";
        send(res, 200, readFileSync(xmlPath), { "content-type": type, "x-experimental": experimental ? "1" : "0" });
      } finally {
        cleanup?.();
      }
    } catch (err) {
      sendJson(res, 500, { error: err.message || "변환에 실패했어요" });
    } finally {
      running--;
      rmSync(dirname(inputPath), { recursive: true, force: true });
    }
  }

  return createServer((req, res) => {
    handle(req, res).catch(() => {
      if (!res.headersSent) sendJson(res, 500, { error: "변환에 실패했어요" });
    });
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const port = Number(process.env.PORT || 8787);
  createConverterServer().listen(port, () => console.log(`converter listening on ${port}`));
}
