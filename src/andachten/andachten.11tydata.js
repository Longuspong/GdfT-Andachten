// Gemeinsame Einstellungen für alle Andachten in diesem Ordner.
// (Früher als andachten.json – jetzt als .js, damit Entwürfe und vordatierte
// Andachten berechnet aus der Veröffentlichung ausgenommen werden können.)

// Datum robust als "JJJJ-MM-TT" formatieren (identisch zum Filter datumISO).
function isoDatum(datum) {
  const d = datum instanceof Date ? datum : new Date(datum);
  return d.toISOString().slice(0, 10);
}

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

// Liegt das Datum der Andacht in der Zukunft (später als heute in Deutschland)?
function istZukunft(data) {
  return datumDerAndacht(data) > heuteBerlin();
}

module.exports = {
  layout: "andacht.njk",
  tags: "andachten",

  eleventyComputed: {
    // Nicht veröffentlicht wird eine Andacht in zwei Fällen:
    //  - Entwurf (entwurf: true) – bewusst zurückgehalten
    //  - Datum in der Zukunft – "vorplanen": erscheint erst an ihrem Tag
    // In beiden Fällen bekommt sie KEINE öffentliche Adresse -> keine Seite.
    // Veröffentlichte Andachten behalten exakt die bisherige URL:
    // /andachten/JJJJ-MM-TT/slug/
    permalink: (data) => {
      if (data.entwurf) return false;
      if (istZukunft(data)) return false;
      return `/andachten/${isoDatum(data.page.date)}/${data.page.fileSlug}/index.html`;
    },

    // Entwürfe und vordatierte Andachten tauchen in keiner Sammlung/Liste auf
    // (Startseite, Archiv, Feed, Sitemap, Nach-Bibelstelle) – Entwürfe sind nur
    // im Admin-Bereich sichtbar, vordatierte Andachten erscheinen automatisch am
    // ersten Seitenbau ab ihrem Datum (siehe täglicher Neu-Bau in api/taeglich.js).
    eleventyExcludeFromCollections: (data) =>
      data.entwurf || istZukunft(data)
        ? true
        : data.eleventyExcludeFromCollections || false,
  },
};
