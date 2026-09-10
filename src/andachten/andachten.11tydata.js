// Gemeinsame Einstellungen für alle Andachten in diesem Ordner.
// (Früher als andachten.json – jetzt als .js, damit Entwürfe berechnet aus der
// Veröffentlichung ausgenommen werden können.)

// Datum robust als "JJJJ-MM-TT" formatieren (identisch zum Filter datumISO).
function isoDatum(datum) {
  const d = datum instanceof Date ? datum : new Date(datum);
  return d.toISOString().slice(0, 10);
}

module.exports = {
  layout: "andacht.njk",
  tags: "andachten",

  eleventyComputed: {
    // Entwürfe (entwurf: true) bekommen KEINE öffentliche Adresse -> es wird
    // keine Seite erzeugt. Veröffentlichte Andachten behalten exakt die
    // bisherige URL: /andachten/JJJJ-MM-TT/slug/
    permalink: (data) => {
      if (data.entwurf) return false;
      return `/andachten/${isoDatum(data.page.date)}/${data.page.fileSlug}/index.html`;
    },

    // Entwürfe tauchen in keiner Sammlung/Liste auf (Startseite, Archiv, Feed,
    // Sitemap, Nach-Bibelstelle) – sie sind nur im Admin-Bereich sichtbar.
    eleventyExcludeFromCollections: (data) =>
      data.entwurf ? true : data.eleventyExcludeFromCollections || false,
  },
};
