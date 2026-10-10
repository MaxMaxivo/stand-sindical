import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
await mkdir(new URL("../dist/", import.meta.url), { recursive: true });
for (const file of ["index.html", "manifest.webmanifest", "service-worker.js", "assets"]) {
  await cp(`${root}${file}`, `${root}dist/${file}`, { recursive: true });
}
console.log("Web preparada en dist. No incluye SQL, documentación ni archivos de trabajo.");
