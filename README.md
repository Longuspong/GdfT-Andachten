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

- **Liste mit Vorschau & Bearbeiten:** Jede Andacht hat zwei Knöpfe – *Vorschau*
  (öffnet sie direkt in der Ansicht, ohne etwas zu ändern) und *Bearbeiten*.
- **Vorschau:** Auch im Editor zeigt der Reiter *Vorschau* sofort, wie die Andacht
  später auf der Seite aussieht – ohne sie zu veröffentlichen.
- **Auto-Speichern:** Während des Schreibens wird dein Text laufend im Browser
  gesichert. Wenn du unterbrichst oder den Tab schließt, kannst du beim nächsten
  Öffnen weiterschreiben.
- **Entwurf oder Veröffentlichen:** *Als Entwurf speichern* legt die Andacht ab,
  ohne sie öffentlich zu zeigen (in der Liste als „Entwurf“ markiert). Du kannst
  sie später – auch von einem anderen Gerät – weiterbearbeiten und dann per
  *Veröffentlichen* live schalten. Beim Veröffentlichen wird – sobald die Andacht
  online ist – automatisch per Telegram benachrichtigt.
- **Korrektur & manuelles Melden:** Bei einer **bereits veröffentlichten** Andacht
  heißt der Speichern-Knopf *Korrektur speichern* – so lässt sich ein Tippfehler
  ausbessern, **ohne erneut** per Telegram zu benachrichtigen. Ein zweiter Knopf,
  *Per Telegram benachrichtigen*, stößt die Meldung bei Bedarf **von Hand** an
  (z. B. falls sie beim Veröffentlichen einmal nicht ankam). Er sendet nur, wenn
  die Andacht **wirklich schon online** ist – sonst gibt es eine klare Meldung.

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
kleinen Hintergrundlauf ([`api/taeglich.js`](api/taeglich.js)), den ein
**GitHub-Actions-Workflow**
([`.github/workflows/taeglich.yml`](.github/workflows/taeglich.yml)) morgens
anstößt. (Früher übernahm das ein Vercel-Cron; der war – vor allem am Wochenende –
unzuverlässig und wurde deshalb durch GitHub Actions ersetzt.)

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

**Warum zwei Zeiten (05:00 und 07:00 UTC)?** GitHub-Actions-Cron rechnet in UTC.
Beide Zeiten liegen ganzjährig (Sommer- wie Winterzeit) **nach 6 Uhr deutscher
Zeit**, sodass der Endpunkt nicht durch seine eigene 6-Uhr-Sperre übersprungen
wird. Der **07:00-UTC-Lauf ist die Reserve**: Er fängt einen ausgefallenen
Haupt-Lauf ab – dass dabei nichts doppelt gemeldet wird, sichert
`telegram-gesendet.json`. (Hinweis: GitHub kann geplante Läufe **verzögern**; das
schiebt sie nur nach hinten, also weiterhin nach 6 Uhr. Der Workflow lässt sich im
**Actions-Tab** auch manuell starten – zum Testen mit der Option „force", die die
6-Uhr-Sperre umgeht.)

**Einmalige Einrichtung** (damit der morgendliche Neu-Bau klappt):

1. **Deploy Hook anlegen:** Vercel → Project Settings → Git → **Deploy Hooks**,
   Branch `main` wählen, Namen vergeben (z. B. `taeglich`), URL kopieren.
2. Diese URL in Vercel als Environment Variable **`DEPLOY_HOOK_URL`** eintragen.
3. Empfohlen: **`CRON_SECRET`** setzen (z. B. `openssl rand -hex 32`), damit der
   Endpunkt `/api/taeglich` vor fremden Aufrufen geschützt ist. Diesen Wert an
   **zwei** Stellen mit **identischem** Inhalt hinterlegen:
   - in **Vercel** als Environment Variable `CRON_SECRET`, und
   - in **GitHub** als Actions-Secret: Repo → Settings → **Secrets and variables**
     → **Actions** → *New repository secret* → Name `CRON_SECRET`.

   Der Workflow schickt diesen Wert beim Aufruf mit. Meldet ein Lauf im
   Actions-Tab **HTTP 401**, stimmen die beiden Werte nicht überein.

> Ohne `DEPLOY_HOOK_URL` bleibt das Vorplanen grundsätzlich erhalten (die Andacht
> ist weiterhin versteckt), sie erscheint dann aber erst, wenn die Seite aus einem
> anderen Grund neu gebaut wird (z. B. beim nächsten Speichern im Admin-Bereich).

### Benachrichtigung per Telegram

Neue Andachten können automatisch in einen Telegram-Kanal gepostet werden –
genau dann, wenn sie auch auf der Seite fällig werden (also am vorgeplanten Tag um
6 Uhr). Leser abonnieren einfach den Kanal. Die Nachricht enthält bewusst nur den
**Titel** und den **Link** zur Andacht (Telegram zeigt darüber automatisch eine
Vorschaukarte).

Grundregel: **Jede Andacht wird genau einmal gemeldet – in dem Moment, in dem sie
öffentlich sichtbar wird.** Konkret:

- **Vorgeplant** (Datum in der Zukunft) → wird an ihrem Tag um 6 Uhr sichtbar und
  dann vom täglichen Lauf gemeldet.
- **Heute veröffentlicht, aber noch vor 6 Uhr** → erscheint um 6 Uhr und wird dann
  gemeldet (wie eine vorgeplante).
- **Heute veröffentlicht, schon nach 6 Uhr** → gemeldet, sobald die neu gebaute
  Seite online ist (meist ~1–2 Minuten nach dem Speichern), nicht erst am
  nächsten Morgen. So doppelt sie sich nicht mit der am nächsten Tag geplanten
  Andacht.

**Erst prüfen, dann melden:** Die Telegram-Meldung geht bewusst **erst raus, wenn
die Andachts-Seite wirklich erreichbar ist** – sonst würde der Link kurzzeitig ins
Leere zeigen, solange Vercel die Seite noch baut. Dazu ruft der Code die
öffentliche Adresse ab, bis sie mit HTTP 200 antwortet. Beim Speichern im Admin
läuft das im Hintergrund (`waitUntil`), damit die Rückmeldung sofort da ist. Steht
die Seite ausnahmsweise nicht innerhalb des Zeitbudgets (~45 Sek., unter dem
60-Sekunden-Limit des Vercel-Hobby-Tarifs, eingestellt in
[`vercel.json`](vercel.json)), wird **nicht** gemeldet – der tägliche 6-Uhr-Lauf
holt die Meldung dann im 3-Tage-Fenster nach.

**Einrichtung:**

1. In Telegram **@BotFather** öffnen, `/newbot` ausführen, Namen vergeben und das
   **Bot-Token** kopieren → als Variable **`TELEGRAM_BOT_TOKEN`** eintragen.
2. Einen **Kanal** anlegen (oder vorhandenen nutzen) und den Bot dort als
   **Administrator** hinzufügen (mit dem Recht, Nachrichten zu posten).
3. Das **Ziel** als Variable **`TELEGRAM_CHAT_ID`** eintragen – entweder der
   öffentliche Kanalname (z. B. `@morgenandachten`) oder die numerische Chat-ID.
4. Im **Abo-Menü** (der dezente Knopf oben links) und auf der „Über“-Seite ist der
   Kanal bereits verlinkt ([`src/_data/site.js`](src/_data/site.js), Feld
   `telegram`) – dort ggf. den richtigen Kanal eintragen, damit Besucher ihn finden.

**Falls eine Meldung einmal nicht ankommt:** Im Admin-Bereich lässt sich die
Telegram-Nachricht für eine **bereits veröffentlichte** Andacht von Hand
nachholen – über *Per Telegram benachrichtigen* im Editor (Endpunkt
[`api/andacht-melden.js`](api/andacht-melden.js)). Der Versand erfolgt nur, wenn
die Andacht schon online erreichbar ist.

**So abonnieren Besucher die Seite:** Oben links öffnet ein dezenter
*Abonnieren*-Knopf ein kleines Menü mit den Möglichkeiten – **E-Mail** (siehe
unten, nur wenn eingerichtet), der **Telegram-Kanal** und der **RSS-Feed**
([`feed.xml`](src/feed.njk)). Das Menü ist als `<details>` gebaut und funktioniert
auch ohne JavaScript.

### Newsletter per E-Mail (Brevo)

Optional können neue Andachten zusätzlich **per E-Mail** verschickt werden – über
**Brevo** (EU-Anbieter, kostenlos bis 300 Mails/Tag). Ist Brevo nicht
eingerichtet, erscheint das E-Mail-Feld im Abo-Menü gar nicht erst, und es wird
nichts versendet.

Ablauf (Double-Opt-In, wie in Deutschland vorgeschrieben):

1. Besucher trägt im Abo-Menü seine Adresse ein → bekommt eine **Bestätigungsmail**.
2. Klick auf den Bestätigungslink → die Adresse landet in der Brevo-Liste
   ([`api/newsletter-bestaetigen.js`](api/newsletter-bestaetigen.js)).
3. Ab dann bekommt er jede neue Andacht per Mail – mit **Abmeldelink** in jeder
   Nachricht ([`api/newsletter-abmelden.js`](api/newsletter-abmelden.js), inkl.
   Ein-Klick-Abmeldung `List-Unsubscribe`).

Der Versand läuft parallel zu Telegram: beim Veröffentlichen (sobald online) und
über den täglichen 6-Uhr-Lauf. Ein eigener Merker
**`newsletter-gesendet.json`** sorgt – getrennt von Telegram – dafür, dass jede
Andacht genau **einmal** gemailt wird; beim ersten Lauf wird der Bestand ohne
rückwirkenden Versand verbucht.

**Einrichtung:**

1. Kostenloses **Brevo-Konto** anlegen (brevo.com).
2. **Absender-Adresse verifizieren** (Brevo → *Senders, Domains & Dedicated IPs*)
   – am besten mit SPF/DKIM, damit die Mails nicht im Spam landen.
3. Eine **Kontaktliste** anlegen und deren **ID** notieren (Brevo → *Contacts →
   Lists*).
4. Einen **API-Schlüssel** erzeugen (Brevo → *SMTP & API → API Keys*).
5. In Vercel als Umgebungsvariablen eintragen (siehe [`.env.example`](.env.example)):
   `BREVO_API_KEY`, `BREVO_LIST_ID`, `BREVO_SENDER_EMAIL`, optional
   `BREVO_SENDER_NAME` und `NEWSLETTER_SECRET`. Danach **neu deployen** – erst dann
   erscheint das E-Mail-Feld im Abo-Menü.
6. Im Admin-Bereich prüft der Knopf **„Newsletter (E-Mail) testen“** die
   Einrichtung und schickt eine Testmail an die Absender-Adresse
   ([`api/newsletter-test.js`](api/newsletter-test.js)).

> **Datenschutz:** Die Adressen liegen bei Brevo (EU, mit Auftragsverarbeitungs­-
> vertrag), nicht im öffentlichen Repo. Abmeldung ist jederzeit über den Link in
> jeder Mail möglich. Bitte einen kurzen Hinweis zum Newsletter in die
> Datenschutzerklärung aufnehmen.

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

### Hinweis zum Zeitplan

Der tägliche Lauf hängt **nicht** mehr am Vercel-Cron (der auf dem Hobby-Tarif
unzuverlässig war), sondern an **GitHub Actions**
([`.github/workflows/taeglich.yml`](.github/workflows/taeglich.yml)) – kostenlos
für öffentliche wie private Repos im normalen Umfang. Der Endpunkt
`/api/taeglich` selbst bleibt auf Vercel; GitHub Actions ruft ihn nur auf.

> Hinweis: GitHub deaktiviert geplante Workflows automatisch, wenn ein Repo
> **60 Tage** ohne Aktivität ist. Da hier regelmäßig Andachten committet werden,
> passiert das im Normalbetrieb nicht; nach einer langen Pause den Workflow ggf.
> im Actions-Tab wieder aktivieren.

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
- **Schriften** werden **selbst ausgeliefert** (nicht vom Google-CDN
  geladen). Das schützt die Privatsphäre der Besucher – es werden keine
  IP-Adressen an Google übertragen (in Deutschland ein wiederkehrendes
  Datenschutz-Thema) – und die Seite lädt schneller (kein Fremd-Request,
  der das Anzeigen blockiert). Die Schrift-Dateien liegen in
  [`src/assets/fonts/`](src/assets/), die Einbindung in
  [`src/css/fonts.css`](src/css/) (automatisch erzeugt). Sollen andere
  Schriften oder Schnitte verwendet werden: die Liste oben in
  [`scripts/schriften-aktualisieren.mjs`](scripts/schriften-aktualisieren.mjs)
  anpassen und einmal `npm run schriften` ausführen – das lädt die Dateien
  neu und schreibt `fonts.css`. Anschließend committen.

---

## Aufbau des Projekts

```
src/
  _data/site.js            Grundeinstellungen (Name, Beschreibung, Adresse …)
  _data/features.js        Bau-Schalter (z. B. E-Mail-Abo nur, wenn Brevo gesetzt)
  _includes/               Vorlagen (Layouts, Kopf, Fuß)
  admin-static/index.html  Admin-Oberfläche (erreichbar unter /admin/)
  andachten/               eine Markdown-Datei je Andacht  ← hier schreibst du
  andachten/andachten.11tydata.js  blendet Entwürfe & vordatierte Andachten aus
  assets/                  Bilder, Logo, Favicon, Vorschaubild (og-bild.jpg)
  assets/fonts/            selbst gehostete Schriften (.woff2, DSGVO-freundlich)
  css/style.css            Design (mobile first; Farben & Schriften ganz oben)
  css/fonts.css            @font-face für die lokalen Schriften (automatisch erzeugt)
  js/thema.js              Hell-/Dunkel-Schalter (oben rechts)
  js/abo.js                Abo-Menü (oben links) – schließt bei Klick außerhalb/Escape
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
  andacht-melden.js        eine veröffentlichte Andacht von Hand per Telegram melden
  abonnieren.js            E-Mail-Newsletter: Anmeldung (Double-Opt-In, Schritt 1)
  newsletter-bestaetigen.js  Bestätigungslink (Schritt 2)
  newsletter-abmelden.js   Abmeldung (Link + Ein-Klick per List-Unsubscribe)
  newsletter-test.js       Admin-Diagnose der Brevo-Einrichtung
  taeglich.js              täglicher Lauf: Neu-Bau + Telegram-Meldung + E-Mail-Versand
  _lib/                    Hilfsmodule (Sitzung, GitHub, Telegram, Melden, Brevo, Mailen)
andachten-archiv/          Rohmaterial des alten Archivs (nicht Teil der Website)
scripts/                   Hilfsskripte (z. B. Schriften laden: npm run schriften)
telegram-gesendet.json     Merkliste bereits gemeldeter Andachten (automatisch)
newsletter-gesendet.json   Merkliste bereits gemailter Andachten (automatisch)
.env.example               Vorlage für die Zugangsdaten (in Vercel eintragen)
vercel.json                Einstellungen für die Veröffentlichung (Vercel)
```
