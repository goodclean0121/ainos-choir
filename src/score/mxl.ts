import JSZip from "jszip";

const NO_SCORE = "압축 파일 안에 악보가 없어요.";

/** Extract the MusicXML text from a compressed .mxl archive. */
export async function unzipMxl(bytes: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);

  const container = zip.file("META-INF/container.xml");
  if (container) {
    const match = (await container.async("string")).match(/full-path="([^"]+)"/);
    const root = match && zip.file(match[1]);
    if (root) return root.async("string");
  }

  const candidate = Object.values(zip.files).find(
    (f) => !f.dir && !f.name.startsWith("META-INF/") && /\.(musicxml|xml)$/i.test(f.name),
  );
  if (!candidate) throw new Error(NO_SCORE);
  return candidate.async("string");
}
