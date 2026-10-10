import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("./", import.meta.url));
const host = process.env.STAND_HOST || "127.0.0.1";
const port = Number(process.env.STAND_PORT || 8080);
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".webmanifest": "application/manifest+json" };

createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (path !== "/" && !path.startsWith("/assets/") && !["/index.html", "/manifest.webmanifest", "/service-worker.js"].includes(path)) {
      res.writeHead(404); res.end("No encontrado"); return;
    }
    let file = resolve(root, "." + path);
    if (file !== resolve(root) && !file.startsWith(resolve(root) + sep)) {
      res.writeHead(403); res.end(); return;
    }
    if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
    res.writeHead(200, { "Content-Type": mime[extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404); res.end("No encontrado");
  }
}).listen(port, host, () => console.log(`Stand Sindical: http://${host}:${port}`));
