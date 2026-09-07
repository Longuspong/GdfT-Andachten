// Zentrale Einstellungen der Website.
// Diese Werte kannst du gefahrlos anpassen – sie erscheinen überall auf der Seite.
module.exports = {
  // Name der Seite (erscheint im Kopfbereich und im Browser-Tab)
  name: "Gerüstet für den Tag",
  // Kurzer Zusatz / Untertitel
  kurzbeschreibung: "Tägliche Andachten",
  // Beschreibung für Suchmaschinen und Vorschau-Links
  beschreibung:
    "Tägliche Andachten auf der Grundlage der Bibel – ein kurzer geistlicher Impuls für jeden Tag.",
  // Sprache der Seite
  sprache: "de",
  // Adresse der veröffentlichten Seite – OHNE Schrägstrich am Ende.
  // Wird für absolute Links gebraucht: Vorschaubild (og:image), sitemap.xml,
  // canonical und den RSS-Feed. Sobald eine eigene Domain vorliegt, nur diesen
  // einen Wert ändern (z. B. "https://geruestet-fuer-den-tag.de").
  url: "https://gdft-andachten.vercel.app",
  // Vorschaubild für geteilte Links (WhatsApp, Telegram, …), relativ zum Ordner
  // src/. Quadratisch, damit es überall gut aussieht.
  vorschaubild: "/assets/og-bild.jpg",
  // Telegram-Kanal (leer lassen, wenn nicht gewünscht)
  telegram: "https://t.me/morgenandachten",
  // Text in der Fußzeile
  fusszeile: "Gerüstet für den Tag",
};
