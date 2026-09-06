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

## Akkord-Bibliothek (Nebenseite)

Unter [`/akkorde/`](src/akkorde/) liegt eine kleine, installierbare App zum
Nachschlagen von **Gitarren-Akkorden** – gedacht zum Begleiten von
Gemeinschaftsliedern. Sie ist von der Hauptnavigation aus erreichbar
(„Akkorde“) und funktioniert **offline** (sie lässt sich auf dem Handy zum
Startbildschirm hinzufügen).

Alle Akkorde stehen in einer einzigen Datei:
[`src/akkorde/chords.json`](src/akkorde/chords.json). Die Griffbilder werden
allein aus diesen Daten als SVG gezeichnet – es gibt keine fest hinterlegten
Bilder. Einen neuen Akkord ergänzt man, indem man einen Eintrag nach diesem
Muster anhängt:

```json
{
  "name": "D9",
  "type": "9",
  "baseFret": 4,
  "frets":   [-1, 5, 4, 5, 5, -1],
  "fingers": [ 0, 2, 1, 3, 4,  0],
  "notes": ["D", "F#", "C", "E"],
  "barres": []
}
```

Bedeutung der Felder:

| Feld       | Bedeutung                                                                        |
| ---------- | -------------------------------------------------------------------------------- |
| `name`     | Angezeigter Akkordname (auch das Suchwort), z. B. `F#m/D`                         |
| `type`     | Gruppe für die Filter-Chips: `Dur`, `Moll`, `sus`, `7`, `9` oder `Slash`         |
| `baseFret` | Ab welchem Bund das Diagramm beginnt (`1` = Sattel; sonst erscheint „N fr“ links) |
| `frets`    | Ein Wert **pro Saite in der Reihenfolge E A D G B e** · `-1` = gedämpft · `0` = leer |
| `fingers`  | Fingernummer je Saite (`1` Zeige … `4` klein, `0` = kein Finger), gleiche Reihenfolge |
| `notes`    | Die klingenden Töne (Anzeige unter dem Griffbild)                                 |
| `barres`   | Barré-Balken: `[{ "fret": 2, "fromString": 4, "toString": 6 }]` (leer = keiner)   |

> **Saiten-Reihenfolge:** In `frets`, `fingers` und den Barré-Angaben ist die
> Saite `1` die tiefe E-Saite (links im Griffbild) und Saite `6` die hohe
> e-Saite (rechts). Alle Arrays haben genau sechs Werte.

Wenn App-Dateien geändert werden (nicht nur `chords.json`), in
[`src/akkorde/sw.js`](src/akkorde/sw.js) die Versionsnummer (`VERSION`) erhöhen –
dann laden installierte Geräte den neuen Stand automatisch nach.

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
  akkorde/                 Akkord-Bibliothek (PWA); chords.json ← Akkorde ergänzen
  assets/                  Bilder, Logo, Favicon
  css/style.css            Design (Farben & Schriften ganz oben)
  index.njk                Startseite: Andacht des Tages + die fünf „Soli“
  archiv.njk               Übersicht aller Andachten
  ueber.njk                Seite „Über“
vercel.json                Einstellungen für die Veröffentlichung (Vercel)
```
