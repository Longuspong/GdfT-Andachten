# Design „Tafel“ (Variante 1b)

Dieses Repo enthält das Redesign bereits vollständig eingebaut.
`npm install && npm start` – fertig.

## Was geändert wurde

* `src/css/style.css` – komplett neu. Alle Farben und Schriften stehen oben
  unter `:root`, der Dunkelmodus direkt darunter.
* `src/_includes/partials/header.njk` – Kopf liegt auf der dunklen Bühne:
  Logo klein links, Navigation, Abo-Menü und Hell/Dunkel-Schalter rechts.
  Mobil rutscht die Navigation in eine eigene Zeile.
* `src/index.njk` – Startseite aufgeräumt: nur noch die Andacht des Tages auf
  der Bühne (mit Datumsspalte), darunter „Zuletzt erschienen“ als Zeilenliste
  und eine Seitenspalte mit Leitvers und Abo. Der eigene Soli-Block ist auf die
  Über-Seite gewandert.
* `src/_includes/andacht.njk` – Leseseite: Datum und Bibelstelle als Marginalie,
  Text in Lora 1,13rem / Zeilenhöhe 1,8 im Maß von 34em, optionaler Kasten
  „Frage für heute“ (Frontmatter `frage:`), Schlagwörter, Vorige/Nächste.
* `src/archiv.njk` – nach Monaten gruppiert, Monat als Marginalie.
* `src/bibelstellen.njk` – Bücher als Raster, Kapitel als Leseweg.
* `src/ueber.njk` – neuer Seitenkopf, die fünf Soli als Kasten.
* `src/_includes/base.njk` – `<main id="inhalt">` ohne Klasse (die Bühne läuft
  über die volle Breite; die Lesebreite setzt jetzt `<div class="inhalt">`
  innerhalb der Seiten), `theme-color` auf die neuen Navy-Werte.
* `eleventy.config.js` – zwei neue Filter: `datumTag`, `datumMonatJahr`.

Unverändert: Schriften, Bilder, JavaScript, API, Newsletter, Telegram, Feed,
Sitemap, Admin.

## Farbrollen

| Variable | Rolle |
|---|---|
| `--buehne` | Navy für Kopf, Hero, Zitat- und Fragekästen |
| `--grund` / `--flaeche` | Lesefläche / abgesetzte Kästen |
| `--gold` | Akzent **nur** auf dunklem Grund |
| `--gold-dunkel` | Akzent auf hellem Grund (kontraststark für kleine Rubriken) |

Goldene Überschriften mit dunkler Kontur gibt es nicht mehr – Hierarchie
entsteht über Schriftgröße und Rubriken.

## Vorige / Nächste

Nutzt `getPreviousCollectionItem` / `getNextCollectionItem` (Eleventy 3). Die
Sammlung ist neueste-zuerst sortiert, die Labels sind deshalb bewusst getauscht.
Wird die Sortierung geändert, in `andacht.njk` tauschen.
