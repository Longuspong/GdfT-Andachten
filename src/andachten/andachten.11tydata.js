// Gemeinsame Einstellungen für alle Andachten in diesem Ordner.
// (Früher als andachten.json – jetzt als .js, damit Entwürfe und vordatierte
// Andachten berechnet aus der Veröffentlichung ausgenommen werden können.)

// Datum robust als "JJJJ-MM-TT" formatieren (identisch zum Filter datumISO).
function isoDatum(datum) {
  const d = datum instanceof Date ? datum : new Date(datum);
  return d.toISOString().slice(0, 10);
}

// Vor dieser Uhrzeit (deutscher Zeit) am Erscheinungstag bleibt die Andacht
// versteckt. Muss zur gleichen Konstante in api/taeglich.js passen, damit eine
// vordatierte Andacht genau dann sichtbar wird, wenn sie auch gemeldet wird.
const VEROEFFENTLICHUNGS_STUNDE = 6;

// Heutiges Datum als "JJJJ-MM-TT" in deutscher Zeit (Europe/Berlin). So wird eine
// vordatierte Andacht genau an ihrem Tag sichtbar – unabhängig davon, in welcher
// Zeitzone der Build-Server (Vercel läuft in UTC) gerade rechnet.
function heuteBerlin() {
  // "en-CA" liefert das Format "JJJJ-MM-TT".
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Aktuelle Stunde (0–23) in deutscher Zeit (Europe/Berlin).
function stundeBerlin() {
  const teile = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const stunde = teile.find((t) => t.type === "hour");
  return stunde ? Number(stunde.value) : 0;
}

// Datum einer Andacht als "JJJJ-MM-TT" möglichst zeitzonensicher bestimmen:
// bevorzugt direkt aus dem Dateinamen (z. B. ".../2026-09-14-hoffnung.md"),
// sonst aus dem von Eleventy ermittelten Datum.
function datumDerAndacht(data) {
  const ausName = String((data.page && data.page.inputPath) || "").match(
    /(\d{4}-\d{2}-\d{2})/
  );
  if (ausName) return ausName[1];
  return isoDatum(data.page.date);
}

// Ist die Andacht noch NICHT fällig, d. h. bleibt sie (noch) versteckt?
// Fällig wird sie an ihrem Datum um VEROEFFENTLICHUNGS_STUNDE Uhr deutscher Zeit.
function istNochNichtFaellig(data) {
  const datum = datumDerAndacht(data);
  const heute = heuteBerlin();
  if (datum < heute) return false; // Vergangenheit -> längst fällig
  if (datum > heute) return true; // Zukunft -> noch nicht
  // Heute: erst ab der Veröffentlichungs-Stunde fällig (davor noch versteckt).
  return stundeBerlin() < VEROEFFENTLICHUNGS_STUNDE;
}

module.exports = {
  layout: "andacht.njk",
  tags: "andachten",

  eleventyComputed: {
    // Nicht veröffentlicht wird eine Andacht in zwei Fällen:
    //  - Entwurf (entwurf: true) – bewusst zurückgehalten
    //  - noch nicht fällig – "vorplanen": erscheint erst an ihrem Tag um 6 Uhr
    // In beiden Fällen bekommt sie KEINE öffentliche Adresse -> keine Seite.
    // Veröffentlichte Andachten behalten exakt die bisherige URL:
    // /andachten/JJJJ-MM-TT/slug/
    permalink: (data) => {
      if (data.entwurf) return false;
      if (istNochNichtFaellig(data)) return false;
      return `/andachten/${isoDatum(data.page.date)}/${data.page.fileSlug}/index.html`;
    },

    // Entwürfe und noch nicht fällige Andachten tauchen in keiner Sammlung/Liste
    // auf (Startseite, Archiv, Feed, Sitemap, Nach-Bibelstelle) – Entwürfe sind
    // nur im Admin-Bereich sichtbar, vordatierte Andachten erscheinen automatisch
    // beim ersten Seitenbau ab ihrem Datum/6 Uhr (täglicher Neu-Bau in
    // api/taeglich.js).
    eleventyExcludeFromCollections: (data) =>
      data.entwurf || istNochNichtFaellig(data)
        ? true
        : data.eleventyExcludeFromCollections || false,
  },
};
