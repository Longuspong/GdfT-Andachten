const BIBELBUECHER = require("./src/_data/bibelbuecher.js");
const SITE = require("./src/_data/site.js");

module.exports = function (eleventyConfig) {
  // Statische Dateien unverändert kopieren (CSS, JavaScript, Bilder, Schriften, ...)
  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/js": "js" });
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  // Admin-Oberfläche 1:1 kopieren (nicht über Nunjucks laufen lassen, damit
  // geschweifte Klammern im eingebetteten JavaScript nicht als Templates
  // interpretiert werden). Nicht öffentlich verlinkt, nur über /admin/ erreichbar.
  eleventyConfig.addPassthroughCopy({ "src/admin-static": "admin" });

  // Bei Änderungen am CSS oder JavaScript neu laden
  eleventyConfig.addWatchTarget("src/css");
  eleventyConfig.addWatchTarget("src/js");

  // --- Datums-Filter (deutsch) ---

  // z. B. "4. September 2026"
  eleventyConfig.addFilter("datumLang", (value) => {
    const d = toDate(value);
    if (!d) return "";
    return new Intl.DateTimeFormat("de-DE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  });

  // z. B. "Freitag, 4. September 2026"
  eleventyConfig.addFilter("datumVoll", (value) => {
    const d = toDate(value);
    if (!d) return "";
    return new Intl.DateTimeFormat("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  });

  // Maschinenlesbar für <time datetime="...">, z. B. "2026-09-04"
  eleventyConfig.addFilter("datumISO", (value) => {
    const d = toDate(value);
    if (!d) return "";
    return d.toISOString().slice(0, 10);
  });

  // Vollständiger Zeitstempel für den RSS-/Atom-Feed (RFC 3339),
  // z. B. "2026-09-04T00:00:00Z"
  eleventyConfig.addFilter("datumRFC3339", (value) => {
    const d = toDate(value);
    if (!d) return "";
    return d.toISOString();
  });

  // Relativen Pfad in eine absolute URL verwandeln (für og:image, sitemap.xml,
  // canonical und den Feed). Grundlage ist site.url; fehlt sie, bleibt der Pfad
  // unverändert. Bereits absolute Adressen (http/https) werden durchgereicht.
  eleventyConfig.addFilter("absolut", (pfad) => {
    const basis = String(SITE.url || "").replace(/\/+$/, "");
    const rel = String(pfad == null ? "" : pfad);
    if (/^https?:\/\//i.test(rel)) return rel;
    if (!basis) return rel;
    return basis + (rel.startsWith("/") ? rel : "/" + rel);
  });

  // Aktuelles Jahr für die Fußzeile
  eleventyConfig.addShortcode("jahr", () => `${new Date().getFullYear()}`);

  // --- Sammlung aller Andachten (neueste zuerst) ---
  eleventyConfig.addCollection("andachten", (collectionApi) => {
    return collectionApi
      .getFilteredByTag("andachten")
      .sort((a, b) => b.date - a.date);
  });

  // --- Andachten nach Bibelbuch und Kapitel gruppieren ---
  // Liefert die Bücher in kanonischer Reihenfolge (alle 66), jeweils mit der
  // Anzahl vorhandener Andachten und den Kapiteln (aufsteigend), in denen die
  // Andachten wiederum nach Vers/Datum sortiert sind. Grundlage für die Seite
  // „Nach Bibelstelle“.
  eleventyConfig.addCollection("bibel", (collectionApi) => {
    const andachten = collectionApi.getFilteredByTag("andachten");

    const proBuch = {};
    andachten.forEach((andacht) => {
      const teile = stelleTeile(andacht.data.stelle);
      if (!teile) return;
      (proBuch[teile.buch] = proBuch[teile.buch] || []).push({
        kapitel: teile.kapitel,
        vers: teile.vers,
        andacht,
      });
    });

    return BIBELBUECHER.map((buch) => {
      const eintraege = proBuch[buch.name] || [];
      const kapMap = {};
      eintraege.forEach((e) => {
        (kapMap[e.kapitel] = kapMap[e.kapitel] || []).push(e);
      });
      const kapitel = Object.keys(kapMap)
        .map(Number)
        .sort((a, b) => a - b)
        .map((nr) => ({
          nummer: nr,
          eintraege: kapMap[nr].sort(
            (a, b) => a.vers - b.vers || a.andacht.date - b.andacht.date
          ),
        }));
      return {
        ...buch,
        slug: slugify(buch.name),
        anzahl: eintraege.length,
        kapitel,
      };
    });
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    // Markdown und Nunjucks als Vorlagensprachen
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["njk", "md", "html"],
  };
};

// Hilfsfunktion: robust in ein Date-Objekt umwandeln
function toDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

// Bibelstelle in Buch, Kapitel und (Start-)Vers zerlegen.
// Beispiele: "Johannes 1,11" · "Johannes 1,32-34" · "Johannes 1,14a" · "1. Mose 3,4"
function stelleTeile(stelle) {
  if (!stelle) return null;
  const m = String(stelle).match(/^(.+?)\s+(\d+),\s*(\d+)/);
  if (!m) return null;
  return { buch: m[1].trim(), kapitel: Number(m[2]), vers: Number(m[3]) };
}

// Anker-tauglichen Slug erzeugen (deutsche Umlaute werden umschrieben).
function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
