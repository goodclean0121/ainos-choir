import { detectFormat } from "./detectFormat";
import { unzipMxl } from "./mxl";
import { parseMusicXml } from "./parseMusicXml";
import { assignRoles } from "./roles";
import type { ScoreFormat, ScoreModel } from "./types";

export const EXPERIMENTAL_WARNING = "자동 인식 결과라 틀린 음이 있을 수 있어요. 꼭 들어보고 확인하세요.";

/** A little longer than the converter's own 10-minute limit, so its error arrives first. */
const CONVERTER_TIMEOUT_MS = 11 * 60 * 1000;

export interface ImportResult {
  xml: string;
  model: ScoreModel;
  roles: Record<string, string>;
  format: ScoreFormat;
  warnings: string[];
}

export interface ImportOptions {
  converterUrl?: string;
  fetch?: typeof fetch;
}

const isZip = (bytes: Uint8Array) => bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;

async function toXml(buffer: ArrayBuffer): Promise<string> {
  return isZip(new Uint8Array(buffer)) ? unzipMxl(buffer) : new TextDecoder().decode(buffer);
}

async function convertRemotely(file: File, buffer: ArrayBuffer, converterUrl: string, fetchFn: typeof fetch) {
  let response: Response;
  try {
    response = await fetchFn(`${converterUrl.replace(/\/+$/, "")}/convert`, {
      method: "POST",
      headers: { "x-filename": encodeURIComponent(file.name) },
      body: buffer,
      signal: AbortSignal.timeout(CONVERTER_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new Error("변환 시간이 너무 오래 걸려요. 잠시 후 다시 시도해 주세요.");
    }
    throw new Error("변환 서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "변환에 실패했어요");
  }
  return { xml: await toXml(await response.arrayBuffer()), experimental: response.headers.get("x-experimental") === "1" };
}

/** Turn any supported score file into MusicXML plus parsed parts and role labels. */
export async function importScore(file: File, opts: ImportOptions = {}): Promise<ImportResult> {
  const buffer = await file.arrayBuffer();
  const detected = detectFormat(file.name, new Uint8Array(buffer.slice(0, 512)));
  if ("error" in detected) throw new Error(detected.error);
  const { format } = detected;

  let xml: string;
  const warnings: string[] = [];
  if (format === "musicxml") {
    xml = new TextDecoder().decode(buffer);
  } else if (format === "mxl") {
    xml = await unzipMxl(buffer);
  } else {
    if (!opts.converterUrl) throw new Error("이 형식은 변환 서버가 필요해요. 관리자에게 변환 서버 설정을 요청해 주세요.");
    const converted = await convertRemotely(file, buffer, opts.converterUrl, opts.fetch ?? fetch);
    xml = converted.xml;
    if (converted.experimental) warnings.push(EXPERIMENTAL_WARNING);
    if (format === "midi") warnings.push("MIDI 파일에는 가사와 파트 이름이 없을 수 있어요. 파트 역할을 직접 확인해 주세요.");
  }

  const model = parseMusicXml(xml);
  return { xml, model, roles: assignRoles(model.parts), format, warnings };
}
