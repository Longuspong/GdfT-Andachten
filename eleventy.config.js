module.exports = function (eleventyConfig) {
  // Statische Dateien unverändert kopieren (CSS, Bilder, Schriften, ...)
  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  // Bei Änderungen am CSS neu laden
  eleventyConfig.addWatchTarget("src/css");

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

  // Aktuelles Jahr für die Fußzeile
  eleventyConfig.addShortcode("jahr", () => `${new Date().getFullYear()}`);

  // --- Sammlung aller Andachten (neueste zuerst) ---
  eleventyConfig.addCollection("andachten", (collectionApi) => {
    return collectionApi
      .getFilteredByTag("andachten")
      .sort((a, b) => b.date - a.date);
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
