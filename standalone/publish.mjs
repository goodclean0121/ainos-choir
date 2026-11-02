// Copies the built trial into public/trial so the deployed app serves it at /trial.
import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("public/trial", { recursive: true });
copyFileSync("standalone/dist/아이노스-체험판.html", "public/trial/index.html");
console.log("trial → public/trial/index.html");
