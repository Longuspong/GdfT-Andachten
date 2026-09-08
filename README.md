# Gerüstet für den Tag – Andachten

Website mit **täglichen Andachten** auf der Grundlage der Bibel („Gerüstet für den
Tag“, GdfT). Jede Andacht ist eine einfache Textdatei – Startseite, Archiv und die
einzelnen Andachtsseiten entstehen automatisch daraus.

Die Seite wird mit [Eleventy](https://www.11ty.dev/) gebaut (ein schlanker
Website-Generator) und über **Vercel** veröffentlicht.

---

## Eine neue Andacht anlegen

1. Gehe in den Ordner [`src/andachten/`](src/andachten/).
2. Erstelle eine neue Datei nach diesem Namensmuster:

   ```
   JAHR-MONAT-TAG-kurzer-titel.md
   ```

   Beispiel: `2026-09-05-hoffnung.md`
   (Das Datum am Anfang bestimmt, wann die Andacht erscheint und einsortiert wird.)

3. Füll die Datei nach diesem Muster (die Beispiel-Andachten im Ordner kannst du dir
   als Vorlage ansehen):

   ```markdown
   ---
   titel: Ein fester Grund
   losung: „Befiehl dem HERRN deine Wege und hoffe auf ihn, er wird's wohlmachen.“
   stelle: Psalm 37,5
   beschreibung: Kurzbeschreibung für Suchmaschinen und geteilte Links.
   ---

   Hier steht der eigentliche Text der Andacht.

   Ein leerer Absatz trennt Absätze. Für Fettdruck: **so**.

   **Gebet:** Ein kurzes Abschlussgebet.
   ```

   Bedeutung der Felder:

   | Feld            | Pflicht | Bedeutung                                             |
   | --------------- | ------- | ----------------------------------------------------- |
   | `titel`         | ja      | Überschrift der Andacht                               |
   | `losung`        | nein    | Bibelvers / Leitwort (wird hervorgehoben)             |
   | `stelle`        | nein    | Bibelstelle zur Losung, z. B. `Psalm 37,5`            |
   | `beschreibung`  | nein    | kurzer Vorschautext für Suchmaschinen / geteilte Links |

4. Speichern, ins Repository übernehmen (committen) und auf GitHub hochladen (pushen).
   Kurz darauf ist die neue Andacht online.

> Tipp: Steht das Datum in der Zukunft, erscheint die Andacht trotzdem sofort, sobald
> sie hochgeladen ist. Ein „Vorplanen“ auf ein zukünftiges Datum wird derzeit nicht
> automatisch versteckt – bei Bedarf bauen wir das später ein.

---

## Vorschau auf dem eigenen Rechner (optional)

Nur nötig, wenn du Änderungen vorab ansehen möchtest. Einmalig
[Node.js](https://nodejs.org/) (Version 18 oder neuer) installieren, dann:

```bash
npm install      # einmalig: Abhängigkeiten laden
npm start        # lokale Vorschau starten
```

Danach die angezeigte Adresse (meist `http://localhost:8080`) im Browser öffnen.
Änderungen an Andachten werden sofort angezeigt. Beenden mit `Strg + C`.

Nur die fertige Seite bauen (ohne Vorschau):

```bash
npm run build    # Ergebnis landet im Ordner _site/
```

---

## Veröffentlichung (Vercel)

Die Seite wird über [Vercel](https://vercel.com/) veröffentlicht. Bei jedem
Hochladen (Push) auf den Branch `main` baut Vercel die Seite automatisch neu und
stellt sie online; für jeden anderen Branch gibt es zusätzlich eine
Vorschau-Adresse. Die Datei [`vercel.json`](vercel.json) sagt Vercel schon alles
Nötige: Bau-Befehl (`npm run build`), Ausgabe-Ordner (`_site`) und dass Adressen
mit Schrägstrich am Ende enden (passend zu den internen Links).

**Einmalige Einrichtung** (nur beim ersten Mal nötig):

1. Bei [vercel.com](https://vercel.com/) anmelden (ein GitHub-Login genügt).
2. **Add New… → Project** wählen und dieses Repository verbinden.
3. Ohne weitere Einstellungen auf **Deploy** klicken – Vercel erkennt Eleventy
   automatisch und nutzt die Angaben aus `vercel.json`.

> **Hinweis:** Die frühere Veröffentlichung über **GitHub Pages** wurde
> abgeschaltet – der zugehörige Workflow (`.github/workflows/deploy.yml`) wurde
> entfernt. Damit die alte Pages-Adresse endgültig offline geht, im Repository
> unter **Settings → Pages** bei **Source** die Option **None** wählen. Wer Pages
> später wieder nutzen möchte, richtet die Quelle dort erneut ein.

---

## Adresse der Seite & geteilte Links (wichtig)

Damit **Vorschaubilder bei WhatsApp/Telegram**, die **sitemap.xml** für
Suchmaschinen, die **canonical**-Angabe und der **RSS-Feed** funktionieren,
braucht die Seite ihre eigene, vollständige Adresse. Diese steht **an einer
einzigen Stelle** in [`src/_data/site.js`](src/_data/site.js):

```js
url: "https://gfdt-andachten.de",
```

- **Ohne** Schrägstrich am Ende eintragen.
- Sobald eine **eigene Domain** eingerichtet ist, nur diesen einen Wert ändern
  (z. B. `"https://geruestet-fuer-den-tag.de"`) – der Rest passt sich automatisch an.

Daraus entstehen beim Bauen automatisch:

| Datei / Merkmal            | Wozu                                                                 |
| -------------------------- | -------------------------------------------------------------------- |
| `sitemap.xml`              | Liste aller Seiten für Suchmaschinen                                 |
| `robots.txt`               | erlaubt Suchmaschinen und verweist auf die Sitemap                   |
| `feed.xml` (Atom/RSS)      | Abo-Feed – Leser bekommen neue Andachten, ohne täglich vorbeizuschauen |
| Vorschaubild (`og:image`)  | Bild in der Linkvorschau (WhatsApp, Telegram, …) – siehe unten       |
| `canonical`                | nennt jeder Seite ihre „offizielle“ Adresse (vermeidet Duplikate)    |

**Vorschaubild:** Es wird [`src/assets/og-bild.jpg`](src/assets/) verwendet (das
Logo, quadratisch). Ein anderes Bild? Einfach diese Datei ersetzen oder in
`site.js` unter `vorschaubild` einen anderen Pfad eintragen.

---

## Andachten-Archiv (Rohmaterial)

Im Ordner [`andachten-archiv/`](andachten-archiv/) wird das bereits vorhandene
Archiv älterer Andachten als **Rohmaterial** gesammelt – als eine oder mehrere
Textdateien. Dieser Ordner ist bewusst **kein** Teil der gebauten Website
(er liegt außerhalb von `src/`); er dient nur als Sammelstelle, aus der einzelne
Andachten nach und nach in [`src/andachten/`](src/andachten/) übernommen werden.

Wie daraus fertige, veröffentlichte Andachten werden, steht in
[`andachten-archiv/README.md`](andachten-archiv/README.md).

---

## Aussehen & Logo anpassen

- **Farben und Schriften** liegen gebündelt oben in
  [`src/css/style.css`](src/css/style.css) als Variablen (Abschnitt `:root`).
  Wenn das Logo vorliegt, werden dort die Farbwerte an das Logo angepasst – die
  ganze Seite färbt sich dann mit um.
- **Logo-Datei** kommt in den Ordner [`src/assets/`](src/assets/) (z. B. als
  `logo.svg`). Danach wird im Seitenkopf
  ([`src/_includes/partials/header.njk`](src/_includes/partials/header.njk)) der
  Platzhalter durch das Logo ersetzt.
- **Seitenname, Untertitel und Fußzeile** stehen in
  [`src/_data/site.js`](src/_data/site.js).

---

## Aufbau des Projekts

```
src/
  _data/site.js            Grundeinstellungen (Name, Beschreibung, Adresse …)
  _includes/               Vorlagen (Layouts, Kopf, Fuß)
  andachten/               eine Markdown-Datei je Andacht  ← hier schreibst du
  assets/                  Bilder, Logo, Favicon, Vorschaubild (og-bild.jpg)
  css/style.css            Design (mobile first; Farben & Schriften ganz oben)
  index.njk                Startseite: Andacht des Tages + die fünf „Soli“
  archiv.njk               Übersicht aller Andachten
  bibelstellen.njk         Andachten nach Bibelstelle
  ueber.njk                Seite „Über“
  sitemap.njk              erzeugt sitemap.xml (für Suchmaschinen)
  robots.njk               erzeugt robots.txt
  feed.njk                 erzeugt feed.xml (RSS/Atom-Abo)
andachten-archiv/          Rohmaterial des alten Archivs (nicht Teil der Website)
vercel.json                Einstellungen für die Veröffentlichung (Vercel)
```
