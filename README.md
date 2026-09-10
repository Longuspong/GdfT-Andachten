# Gerüstet für den Tag – Andachten

Website mit **täglichen Andachten** auf der Grundlage der Bibel („Gerüstet für den
Tag“, GdfT). Jede Andacht ist eine einfache Textdatei – Startseite, Archiv und die
einzelnen Andachtsseiten entstehen automatisch daraus.

Die Seite wird mit [Eleventy](https://www.11ty.dev/) gebaut (ein schlanker
Website-Generator) und über **Vercel** veröffentlicht.

---

## Andachten im Browser verwalten (Admin-Bereich)

Der einfachste Weg – ganz ohne Dateien, GitHub oder Programme: die Verwaltung
unter **`/admin/`** (also z. B. `https://gfdt-andachten.de/admin/`).

Dort kannst du dich mit einem Passwort anmelden und Andachten **anlegen,
bearbeiten und löschen**. Ein eingebauter Text-Editor bietet Knöpfe für
Fettdruck, Überschriften, Zitate und Listen.

Besonderheiten:

- **Vorschau:** Über den Reiter *Vorschau* siehst du sofort, wie die Andacht
  später auf der Seite aussieht – ohne sie zu veröffentlichen.
- **Auto-Speichern:** Während des Schreibens wird dein Text laufend im Browser
  gesichert. Wenn du unterbrichst oder den Tab schließt, kannst du beim nächsten
  Öffnen weiterschreiben.
- **Entwurf oder Veröffentlichen:** *Als Entwurf speichern* legt die Andacht ab,
  ohne sie öffentlich zu zeigen (in der Liste als „Entwurf“ markiert). Du kannst
  sie später – auch von einem anderen Gerät – weiterbearbeiten und dann per
  *Veröffentlichen* live schalten.

Gespeichert wird direkt ins GitHub-Repository; kurz darauf baut Vercel die Seite
automatisch neu (dauert meist 1–2 Minuten). Es gibt keine zusätzliche Datenbank.

### Einmalige Einrichtung (Zugangsdaten)

Der Admin-Bereich braucht ein paar geheime Werte. Diese werden **nicht** im Code
gespeichert, sondern in **Vercel → Project Settings → Environment Variables**
(Vorlage siehe [`.env.example`](.env.example)):

| Variable          | Bedeutung                                                                 |
| ----------------- | ------------------------------------------------------------------------- |
| `ADMIN_PASSWORD`  | Das Passwort für den Login unter `/admin/`                                |
| `SESSION_SECRET`  | Langer Zufallstext zum Signieren der Anmeldung (z. B. `openssl rand -hex 32`) |
| `GITHUB_TOKEN`    | GitHub-Token (fine-grained), nur dieses Repo, Recht „Contents: Read and write“ |
| `GITHUB_OWNER`    | GitHub-Benutzer- oder Organisationsname                                    |
| `GITHUB_REPO`     | Name des Repositories (z. B. `GdfT-Andachten`)                             |
| `GITHUB_BRANCH`   | Ziel-Branch für Vercel (meist `main`)                                      |

Nach dem Eintragen einmal neu deployen. Danach ist `/admin/` einsatzbereit.

> Der Admin-Bereich ist bewusst für **eine Person mit einem Passwort** gedacht.
> Er ist nicht öffentlich verlinkt und wird von Suchmaschinen ignoriert.

---

## Eine neue Andacht anlegen (alternativ: direkt als Datei)

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

> **Vorplanen:** Steht das Datum in der **Zukunft**, wird die Andacht bis dahin
> automatisch **versteckt** (keine Seite, nicht im Archiv, Feed oder auf der
> Startseite) und erscheint dann von selbst an ihrem Tag **morgens um 6 Uhr**
> (deutscher Zeit). Du kannst sie also heute schreiben und „veröffentlichen“,
> sichtbar wird sie erst am gewählten Tag um 6 Uhr. Wie das technisch funktioniert
> (und was einmalig in Vercel einzurichten ist), steht im Abschnitt
> [„Vorplanen & Benachrichtigung“](#vorplanen--benachrichtigung).
>
> Im Admin-Bereich zeigt ein **Mini-Kalender** unter dem Datumsfeld, an welchen
> Tagen schon etwas hinterlegt ist (grün = veröffentlicht, gold = Entwurf); ein
> Klick wählt den Tag. Ist der gewählte Tag bereits belegt, erscheint ein Hinweis
> mit einem Knopf, um die vorhandene Andacht bzw. den Entwurf direkt zu öffnen.

---

## Vorplanen & Benachrichtigung

Zwei zusammengehörige Funktionen: Andachten **im Voraus** schreiben und am
richtigen Tag **morgens um 6 Uhr** automatisch erscheinen lassen – und neue
Andachten automatisch in einen **Telegram-Kanal** posten. Beides läuft über einen
kleinen Hintergrundlauf ([`api/taeglich.js`](api/taeglich.js)), den zwei
**Vercel-Cron-Jobs** (eingetragen in [`vercel.json`](vercel.json)) morgens aufrufen.

### So funktioniert das Vorplanen

- Eine Andacht mit einem Datum **in der Zukunft** wird beim Seitenbau
  automatisch ausgeblendet – und zwar bis zu ihrem Tag um 6 Uhr deutscher Zeit
  (geregelt in
  [`src/andachten/andachten.11tydata.js`](src/andachten/andachten.11tydata.js)).
- Weil eine fertig gebaute Seite sich nicht von selbst neu baut, stößt der
  morgendliche Lauf einen **neuen Seitenbau** an. Ab 6 Uhr am gewählten Tag ist
  die Andacht nicht mehr „Zukunft“ und erscheint automatisch.
- Alle Zeiten werden in **deutscher Zeit** (Europe/Berlin) bestimmt – unabhängig
  davon, dass Vercel intern in UTC rechnet.

**Warum zwei Cron-Zeiten (04:00 und 05:00 UTC)?** Vercel-Cron kennt nur UTC. Wegen
der Sommer-/Winterzeit entspricht 6 Uhr deutscher Zeit mal 04:00 UTC (Sommer),
mal 05:00 UTC (Winter). Beide Läufe sind eingetragen; der Code lässt aber nur den
Lauf durch, der tatsächlich in die 6-Uhr-Stunde deutscher Zeit fällt (der andere
wird abgewiesen). So wird ganzjährig zuverlässig gegen 6 Uhr veröffentlicht.
(Hinweis: Vercel löst Cron-Jobs irgendwann **innerhalb** der geplanten Stunde aus,
die Veröffentlichung liegt also in der 6-Uhr-Stunde, nicht sekundengenau um 6:00.)

**Einmalige Einrichtung in Vercel** (damit der nächtliche Neu-Bau klappt):

1. **Deploy Hook anlegen:** Project Settings → Git → **Deploy Hooks**, Branch
   `main` wählen, Namen vergeben (z. B. `taeglich`), URL kopieren.
2. Diese URL als Environment Variable **`DEPLOY_HOOK_URL`** eintragen.
3. Empfohlen: **`CRON_SECRET`** setzen (z. B. `openssl rand -hex 32`). Vercel
   schickt diesen Wert beim Cron-Aufruf automatisch mit; nur damit ist der
   Endpunkt `/api/taeglich` vor fremden Aufrufen geschützt.

> Ohne `DEPLOY_HOOK_URL` bleibt das Vorplanen grundsätzlich erhalten (die Andacht
> ist weiterhin versteckt), sie erscheint dann aber erst, wenn die Seite aus einem
> anderen Grund neu gebaut wird (z. B. beim nächsten Speichern im Admin-Bereich).

### Benachrichtigung per Telegram

Neue Andachten können automatisch in einen Telegram-Kanal gepostet werden –
genau dann, wenn sie auch auf der Seite fällig werden (also am vorgeplanten Tag um
6 Uhr). Leser abonnieren einfach den Kanal. Die Nachricht enthält bewusst nur den
**Titel** und den **Link** zur Andacht (Telegram zeigt darüber automatisch eine
Vorschaukarte).

**Einrichtung:**

1. In Telegram **@BotFather** öffnen, `/newbot` ausführen, Namen vergeben und das
   **Bot-Token** kopieren → als Variable **`TELEGRAM_BOT_TOKEN`** eintragen.
2. Einen **Kanal** anlegen (oder vorhandenen nutzen) und den Bot dort als
   **Administrator** hinzufügen (mit dem Recht, Nachrichten zu posten).
3. Das **Ziel** als Variable **`TELEGRAM_CHAT_ID`** eintragen – entweder der
   öffentliche Kanalname (z. B. `@morgenandachten`) oder die numerische Chat-ID.
4. Im Footer/auf der „Über“-Seite ist der Kanal bereits verlinkt
   ([`src/_data/site.js`](src/_data/site.js), Feld `telegram`) – dort ggf. den
   richtigen Kanal eintragen, damit Besucher ihn finden.

Wie es sich merkt, was schon gepostet wurde (ohne Datenbank):

- Eine kleine Datei **`telegram-gesendet.json`** im Repo (außerhalb von `src/`,
  also nicht Teil der Website) führt Buch über bereits gemeldete Andachten.
- Beim **allerersten Lauf** wird der gesamte vorhandene Bestand als „schon
  bekannt“ verbucht, **ohne** ihn nachträglich zu posten (sonst würde das Archiv
  den Kanal fluten). Erst danach neu fällige Andachten werden gemeldet.
- Entwürfe werden nicht gemeldet. Ein ausgefallener Lauf wird bis zu drei Tage
  später nachgeholt.

> WhatsApp wurde bewusst **nicht** eingebaut: Automatisches Posten ginge dort nur
> über die kostenpflichtige WhatsApp-Business-API (mit Freigabeprozess);
> WhatsApp-Kanäle lassen sich nicht automatisiert bespielen. Wer auch WhatsApp
> möchte, kann die neue Andacht weiterhin von Hand dort teilen.

### Hinweis zum Vercel-Tarif

Der **Hobby-Tarif** erlaubt **bis zu 2 Cron-Jobs**, jeweils **einmal pro Tag** –
also genau die beiden hier genutzten Zeiten (04:00 und 05:00 UTC für 6 Uhr
deutscher Zeit, ganzjährig). Häufigere Zeitpläne (z. B. stündlich) oder eine
sekundengenaue Auslösung erfordern einen kostenpflichtigen Tarif.

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
  admin-static/index.html  Admin-Oberfläche (erreichbar unter /admin/)
  andachten/               eine Markdown-Datei je Andacht  ← hier schreibst du
  andachten/andachten.11tydata.js  blendet Entwürfe & vordatierte Andachten aus
  assets/                  Bilder, Logo, Favicon, Vorschaubild (og-bild.jpg)
  css/style.css            Design (mobile first; Farben & Schriften ganz oben)
  index.njk                Startseite: Andacht des Tages + die fünf „Soli“
  archiv.njk               Übersicht aller Andachten
  bibelstellen.njk         Andachten nach Bibelstelle
  ueber.njk                Seite „Über“
  sitemap.njk              erzeugt sitemap.xml (für Suchmaschinen)
  robots.njk               erzeugt robots.txt
  feed.njk                 erzeugt feed.xml (RSS/Atom-Abo)
api/                       Server-Funktionen (Vercel)
  login.js / logout.js     An- und Abmelden
  andachten.js             Andachten lesen, anlegen, ändern, löschen
  taeglich.js              täglicher Lauf: Neu-Bau anstoßen + Telegram-Meldung
  _lib/                    Hilfsmodule (Sitzung, GitHub-Zugriff, Telegram)
andachten-archiv/          Rohmaterial des alten Archivs (nicht Teil der Website)
telegram-gesendet.json     Merkliste bereits gemeldeter Andachten (automatisch)
.env.example               Vorlage für die Zugangsdaten (in Vercel eintragen)
vercel.json                Einstellungen für die Veröffentlichung (Vercel)
```
