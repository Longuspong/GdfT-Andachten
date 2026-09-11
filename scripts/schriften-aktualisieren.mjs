// Schriften selbst hosten – Aktualisierungs-Skript
// ---------------------------------------------------------------------------
// Lädt die benötigten Google-Fonts (nur die Subsets „latin“ und „latin-ext“,
// die für deutschen Text inkl. Umlauten reichen) einmalig als .woff2 herunter
// und erzeugt daraus src/css/fonts.css mit lokalen @font-face-Regeln.
//
// Warum? So werden beim Besuch der Seite keine IP-Adressen an Google gesendet
// (DSGVO) und es entfällt ein render-blockender Fremd-Request. Die Dateien
// liegen im Repo und werden beim Bauen nach /assets/fonts/ kopiert.
//
// Aufruf (vom Projektordner):
//   npm run schriften
//
// Nur nötig, wenn sich die gewünschten Schriften/Schnitte ändern. Dann unten
// FAMILIES anpassen und das Skript erneut ausführen; anschließend committen.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HIER = path.dirname(fileURLToPath(import.meta.url));
const WURZEL = path.resolve(HIER, "..");
const FONT_DIR = path.join(WURZEL, "src/assets/fonts");
const CSS_OUT = path.join(WURZEL, "src/css/fonts.css");

// Aktueller Desktop-Chrome-UA, damit Google die kompakten .woff2 (statt .ttf)
// mit Unicode-Bereichen zurückgibt.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

// Genau die Familien/Schnitte, die die Seite nutzt (vgl. src/_includes/base.njk).
const FAMILIES = [
  "Cormorant+Garamond:ital,wght@0,500;0,600;1,500",
  "Lora:ital,wght@0,400;0,500;0,600;1,400",
  "Inter:wght@400;500;600",
];

// Nur diese Subsets speichern (kleiner Download, deckt deutschen Text ab).
const WANTED_SUBSETS = new Set(["latin", "latin-ext"]);

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Zerlegt die zurückgegebene CSS in einzelne @font-face-Blöcke samt dem
// vorangestellten /* subset */-Kommentar.
function parseBlocks(css) {
  const blocks = [];
  const re = /\/\*\s*([a-z0-9-]+)\s*\*\/\s*(@font-face\s*{[^}]*})/gi;
  let m;
  while ((m = re.exec(css)) !== null) blocks.push({ subset: m[1], block: m[2] });
  return blocks;
}

function feld(block, name) {
  const m = block.match(new RegExp(name + "\\s*:\\s*([^;]+);"));
  return m ? m[1].trim() : "";
}

async function main() {
  await fs.mkdir(FONT_DIR, { recursive: true });
  const out = [];
  let geladen = 0;

  for (const fam of FAMILIES) {
    const url = `https://fonts.googleapis.com/css2?family=${fam}&display=swap`;
    const css = await (await fetch(url, { headers: { "User-Agent": UA } })).text();
    if (!/woff2/.test(css)) {
      throw new Error(`Keine woff2 für ${fam} erhalten – UA/Netzwerk prüfen.`);
    }
    for (const { subset, block } of parseBlocks(css)) {
      if (!WANTED_SUBSETS.has(subset)) continue;
      const family = feld(block, "font-family").replace(/['"]/g, "");
      const style = feld(block, "font-style") || "normal";
      const weight = feld(block, "font-weight") || "400";
      const unicode = feld(block, "unicode-range");
      const src = block.match(/url\((https:\/\/[^)]+\.woff2)\)/);
      if (!src) continue;

      const fname = `${slug(family)}-${weight}-${style}-${subset}.woff2`;
      const buf = Buffer.from(
        await (await fetch(src[1], { headers: { "User-Agent": UA } })).arrayBuffer()
      );
      await fs.writeFile(path.join(FONT_DIR, fname), buf);
      geladen++;

      out.push(
        `@font-face {\n` +
          `  font-family: "${family}";\n` +
          `  font-style: ${style};\n` +
          `  font-weight: ${weight};\n` +
          `  font-display: swap;\n` +
          `  src: url("/assets/fonts/${fname}") format("woff2");\n` +
          (unicode ? `  unicode-range: ${unicode};\n` : "") +
          `}`
      );
    }
  }

  const kopf =
    `/* =========================================================================\n` +
    `   Selbst gehostete Schriften (Cormorant Garamond, Lora, Inter)\n` +
    `   -------------------------------------------------------------------------\n` +
    `   AUTOMATISCH ERZEUGT von scripts/schriften-aktualisieren.mjs\n` +
    `   – nicht von Hand bearbeiten. Neu erzeugen mit:  npm run schriften\n` +
    `\n` +
    `   Bewusst lokal ausgeliefert statt vom Google-CDN: So werden keine\n` +
    `   Besucher-IP-Adressen an Google übertragen (DSGVO) und es entfällt ein\n` +
    `   render-blockender Fremd-Request. Enthalten sind nur die Subsets „latin“\n` +
    `   und „latin-ext“ (deutscher Text inkl. Umlauten). Die .woff2-Dateien\n` +
    `   liegen in src/assets/fonts/ und werden beim Bauen nach /assets/fonts/\n` +
    `   kopiert. Der Browser lädt dank unicode-range nur das jeweils Nötige.\n` +
    `   ========================================================================= */\n\n`;

  await fs.writeFile(CSS_OUT, kopf + out.join("\n\n") + "\n");
  console.log(`Fertig: ${geladen} Schriftdateien geladen, ${out.length} @font-face-Regeln in src/css/fonts.css`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
