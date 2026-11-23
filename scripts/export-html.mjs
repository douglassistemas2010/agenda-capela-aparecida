import { readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
const root = resolve(import.meta.dirname, ".."),
  dist = join(root, "dist");
let html = readFileSync(join(dist, "index.html"), "utf8");
html = html.replace(
  /<script\b[^>]*\bsrc="([^"]+\.js)"[^>]*><\/script>/g,
  (_, path) =>
    `<script type="module">${readFileSync(join(dist, path), "utf8").replace(/<\/script/gi, "<\\/script")}</script>`,
);
html = html.replace(
  /<link\b[^>]*href="([^"]+\.css)"[^>]*>/g,
  (_, path) => `<style>${readFileSync(join(dist, path), "utf8")}</style>`,
);
html = html.replace(
  /<link\b[^>]*rel="(?:manifest|apple-touch-icon)"[^>]*>/g,
  "",
);
html = html.replace(
  /href="\.\/icon.svg"/g,
  `href="data:image/svg+xml;base64,${Buffer.from(readFileSync(join(dist, "icon.svg"))).toString("base64")}"`,
);
html = html.replace(
  "<head>",
  `<head><!-- Cópia de layout gerada em ${new Date().toISOString()}. Dados ilustrativos; operações reais somente online. -->`,
);
writeFileSync(join(root, "PREVIA-APP.html"), html);
writeFileSync(join(dist, "PREVIA-APP.html"), html);
console.log("Cópia HTML atualizada: PREVIA-APP.html");
