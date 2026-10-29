import { execFile } from "node:child_process";
import { mkdtempSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

export const CONVERT_TIMEOUT_MS = 600_000;

const MSCORE = process.env.MSCORE_BIN || "mscore";
const AUDIVERIS = process.env.AUDIVERIS_BIN || "audiveris";

const defaultRun = promisify(execFile);

function findFirst(dir, re) {
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      const found = findFirst(path, re);
      if (found) return found;
    } else if (re.test(name)) {
      return path;
    }
  }
  return undefined;
}

/**
 * Convert a score file to MusicXML.
 * @param {string} inputPath
 * @param {"musescore"|"midi"|"pdf"|"image"} format
 * @returns {Promise<{ xmlPath: string, experimental: boolean }>}
 */
export async function convert(inputPath, format, run = defaultRun) {
  const outDir = mkdtempSync(join(tmpdir(), "ainos-convert-"));
  // MuseScore needs a display unless Qt renders offscreen.
  const options = { timeout: CONVERT_TIMEOUT_MS, maxBuffer: 16 * 1024 * 1024, env: { ...process.env, QT_QPA_PLATFORM: "offscreen" } };
  const recognised = format === "pdf" || format === "image";

  try {
    if (recognised) {
      await run(AUDIVERIS, ["-batch", "-export", "-output", outDir, "--", inputPath], options);
    } else {
      await run(MSCORE, ["-o", join(outDir, "out.musicxml"), inputPath], options);
    }
  } catch (err) {
    if (err?.killed || err?.signal === "SIGTERM") throw new Error("변환 시간이 너무 오래 걸려요");
    throw new Error("변환에 실패했어요");
  }

  const xmlPath = findFirst(outDir, recognised ? /\.mxl$/ : /\.musicxml$/);
  if (!xmlPath) throw new Error("변환에 실패했어요");
  return { xmlPath, experimental: recognised };
}
