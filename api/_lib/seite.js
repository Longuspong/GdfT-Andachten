// Baut eine einfache, zum Seitendesign passende HTML-Seite für die Antworten der
// Newsletter-Endpunkte (Anmeldung eingegangen, bestätigt, abgemeldet, Fehler).
// Bindet die echten Stylesheets der Seite ein, damit alles vertraut aussieht.

const SITE = require("../../src/_data/site.js");

function basisUrl() {
  return String(SITE.url || "").replace(/\/+$/, "");
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

// { titel, ueberschrift, absaetze: [text…], aktionText, aktionUrl, ton }
// ton: "erfolg" | "fehler" | undefined (nur für die Randfarbe der Karte)
function seiteHtml({ titel, ueberschrift, absaetze = [], aktionText, aktionUrl, ton }) {
  const base = basisUrl();
  const rand =
    ton === "erfolg"
      ? "var(--farbe-akzent)"
      : ton === "fehler"
      ? "#b3261e"
      : "var(--farbe-linie)";
  const absHtml = absaetze
    .map((a) => `<p class="nl-karte__text">${escapeHTML(a)}</p>`)
    .join("");
  const aktion =
    aktionText && aktionUrl
      ? `<p class="nl-karte__aktion"><a class="knopf" href="${escapeHTML(aktionUrl)}">${escapeHTML(
          aktionText
        )}</a></p>`
      : "";
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>${escapeHTML(titel)} · ${escapeHTML(SITE.name)}</title>
<link rel="stylesheet" href="${base}/css/fonts.css" />
<link rel="stylesheet" href="${base}/css/style.css" />
<style>
  body { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
  .nl-karte {
    max-width: 34rem; width: 100%;
    background: var(--farbe-flaeche);
    border: 1px solid var(--farbe-linie);
    border-top: 4px solid ${rand};
    border-radius: var(--radius);
    box-shadow: var(--schatten);
    padding: 1.75rem 1.6rem 2rem;
    text-align: center;
  }
  .nl-karte__logo { width: 72px; height: 72px; border-radius: 50%; box-shadow: var(--schatten); }
  .nl-karte h1 { font-family: var(--schrift-titel); font-size: 1.5rem; margin: 0.8rem 0 0.6rem; color: var(--farbe-primaer); }
  .nl-karte__text { color: var(--farbe-text); margin: 0.5rem 0; line-height: 1.6; }
  .nl-karte__aktion { margin-top: 1.4rem; }
  .nl-karte__zurueck { display: inline-block; margin-top: 1rem; font-size: 0.9rem; }
</style>
</head>
<body>
  <main class="nl-karte">
    <img class="nl-karte__logo" src="${base}/assets/logo-rund.png" width="72" height="72" alt="${escapeHTML(
      SITE.name
    )}" />
    <h1>${escapeHTML(ueberschrift)}</h1>
    ${absHtml}
    ${aktion}
    <p><a class="nl-karte__zurueck" href="${base}/">← Zur Startseite</a></p>
  </main>
</body>
</html>`;
}

module.exports = { seiteHtml, escapeHTML, basisUrl };
