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
  // Leitvers im Kopfbereich der Startseite (passend zu „Sola Scriptura“ –
  // allein die Schrift). Vers und Bibelstelle lassen sich frei anpassen.
  leitvers:
    "Das Gras verdorrt, die Blume verwelkt, aber das Wort unseres Gottes bleibt in Ewigkeit.",
  leitvers_stelle: "Jesaja 40,8",
  // Adresse der veröffentlichten Seite – OHNE Schrägstrich am Ende.
  // Wird für absolute Links gebraucht: Vorschaubild (og:image), sitemap.xml,
  // canonical und den RSS-Feed. Bei einem Domainwechsel nur diesen einen Wert
  // ändern – der Rest passt sich automatisch an.
  url: "https://gfdt-andachten.de",
  // Vorschaubild für geteilte Links (WhatsApp, Telegram, …), relativ zum Ordner
  // src/. Quadratisch, damit es überall gut aussieht.
  vorschaubild: "/assets/og-bild.jpg",
  // Telegram-Kanal (leer lassen, wenn nicht gewünscht)
  telegram: "https://t.me/morgenandachten",
  // Text in der Fußzeile
  fusszeile: "Gerüstet für den Tag",

  // --- Kontakt ----------------------------------------------------------
  // Adresse, an die das Kontaktformular (/kontakt/) die Nachrichten schickt.
  // Landet in diesem Postfach (bzw. dessen Alias). Bei Bedarf ändern.
  kontakt_email: "ronny@gfdt-andachten.de",

  // Hinweis: Ein vollständiges Impressum (mit Name/Anschrift bzw. den Angaben
  // eines Vereins/einer Gemeinde) sowie die Angabe des Verantwortlichen in der
  // Datenschutzerklärung sind in Deutschland grundsätzlich Pflicht. Beides ist
  // hier bewusst noch offen gelassen, bis geklärt ist, ob ein Verein/eine
  // Einrichtung angegeben werden kann. Dann hier die Daten ergänzen und das
  // Impressum wieder aufnehmen.
};
