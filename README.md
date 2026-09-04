# Gerüstet für den Tag – Andachten

Website mit **täglichen Andachten** auf der Grundlage der Bibel („Gerüstet für den
Tag“, GdfT). Jede Andacht ist eine einfache Textdatei – Startseite, Archiv und die
einzelnen Andachtsseiten entstehen automatisch daraus.

Die Seite wird mit [Eleventy](https://www.11ty.dev/) gebaut (ein schlanker
Website-Generator) und über **GitHub Pages** veröffentlicht.

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

## Veröffentlichung (GitHub Pages)

Bei jedem Hochladen (Push) auf den Branch `main` baut GitHub die Seite automatisch
neu und veröffentlicht sie. Zuständig dafür ist die Datei
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

**Einmalige Einrichtung im Repository** (nur beim ersten Mal nötig):

1. Auf GitHub in **Settings → Pages** gehen.
2. Bei **Build and deployment → Source** die Option **GitHub Actions** auswählen.

Danach erscheint die veröffentlichte Adresse dort und unter dem Menüpunkt
**Actions** nach dem ersten erfolgreichen Durchlauf.

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
  _data/site.js            Grundeinstellungen (Name, Beschreibung, …)
  _includes/               Vorlagen (Layouts, Kopf, Fuß)
  andachten/               eine Markdown-Datei je Andacht  ← hier schreibst du
  assets/                  Bilder, Logo, Favicon
  css/style.css            Design (Farben & Schriften ganz oben)
  index.njk                Startseite: Andacht des Tages
  archiv.njk               Übersicht aller Andachten
  ueber.njk                Seite „Über“
.github/workflows/         automatische Veröffentlichung
```
