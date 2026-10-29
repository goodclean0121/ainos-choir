// Folds the built script and stylesheet into index.html so the trial runs from a single file.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [dist, out] = process.argv.slice(2);
let html = readFileSync(join(dist, "index.html"), "utf8");
html = html.replace(/<script type="module" crossorigin src="\.\/[^"]+"><\/script>/, "");
html = html.replace(/<link rel="stylesheet" crossorigin href="\.\/([^"]+)">/, (_, f) => `<style>${readFileSync(join(dist, f), "utf8")}</style>`);
const js = readFileSync(join(dist, (readFileSync(join(dist, "index.html"), "utf8").match(/src="\.\/([^"]+\.js)"/) || [])[1]), "utf8");
// Inline, so nothing is fetched: file:// pages cannot load sibling scripts as modules.
html = html.replace("</body>", () => `<script type="module">${js.replace(/<\/script/gi, "<\\/script")}</script></body>`);
writeFileSync(out, html);
