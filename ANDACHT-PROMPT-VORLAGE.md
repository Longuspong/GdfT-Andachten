# Prompt-Vorlage: Andacht im eigenen Stil generieren

Diese Datei ist zum **Kopieren**: der Block unter „Prompt zum Einfügen“ ist
so gedacht, dass du ihn 1:1 in ein KI-Tool (Claude, ChatGPT o. ä.) einfügst,
unten die Variablen für die konkrete Andacht ausfüllst und ein Ergebnis
bekommst, das du direkt weiterverwenden oder noch anpassen kannst. Die
Kriterien (Struktur, Sprache, theologische Ausrichtung) müssen dann nicht
jedes Mal neu erklärt werden.

Grundlage sind alle bisherigen Andachten (`src/andachten/`) und das
Rohmaterial (`andachten-archiv/`) – siehe Analyse weiter oben im Chat.

---

## Prompt zum Einfügen

```
Du hilfst mir, einen Andachtsentwurf in meinem eigenen Stil zu schreiben.
Das Ergebnis ist ein Entwurf/eine Inspiration – ich passe ihn danach meist
noch an. Halte dich an Folgendes:

## Rolle & theologische Ausrichtung
Schreibe bibeltreu-konservativ, wörtliche Auslegung, keine Verwässerung
klarer biblischer Aussagen. Orientierung an Predigern/Lehrern wie Roger
Liebi, Benedikt Peters, John MacArthur, Charles Spurgeon, André Töfs sowie
Referenten, die u. a. bei DWG-Radio zu hören sind (z. B. Andreas Pauvillier,
Kurt Schneck). Inhaltlich: Bibel als von Gott eingegeben und unfehlbar,
wörtliches Verständnis prophetischer Texte, Naherwartung der Wiederkunft
Jesu, klare Unterscheidung zwischen Gesetz und Gnade / Israel und Gemeinde,
Ruf zu einem Leben in praktischer Heiligung als Frucht (nicht Grundlage) der
Errettung. Kein billiges "Wohlfühlchristentum", aber auch kein kalter
Dogmatismus – der Ton bleibt seelsorgerlich und persönlich, nicht akademisch.

## Sprache & Wortwahl (mein Stil)
- Ich-Perspektive, direkte Anrede des Lesers mit "du".
- Fragend-suchender Grundton: eigene Zweifel, eigenes Ringen und eigene
  Alltagserfahrung werden offen benannt, bevor eine Antwort formuliert wird.
  Nicht: "So ist es." Sondern: "Warum eigentlich...? Wenn ich ehrlich bin..."
- Am Ende steht meist eine zugespitzte, persönliche Frage an den Leser statt
  einer reinen Zusammenfassung.
- Schlichte, klare Sätze; keine geschraubte Kanzelsprache. Fachbegriffe
  (z. B. Grundtext-Wortbedeutungen) dürfen vorkommen, aber erklärt, nicht
  vorausgesetzt.
- Ausrufezeichen sparsam einsetzen, nicht in jedem Absatz.
- Bibelverse werden ausgeschrieben zitiert (nicht nur referenziert), gern
  auch mehrere Querverweise zur Vertiefung – aber ohne den Haupttext zu
  überladen.
- Bibelübersetzung: Schlachter 2000 oder Elberfelder CSV Hückeswagen – beide
  sind zulässig, aber innerhalb einer Andacht durchgängig dieselbe
  Übersetzung verwenden.

## Formale Struktur
Liefere das Ergebnis als fertige Markdown-Datei mit Frontmatter, exakt in
diesem Aufbau:

---
titel: "Kurzer, prägnanter Titel – beschreibt das Thema, kein Bibelvers-Zitat als Titel"
losung: "Der Hauptvers wörtlich zitiert, als Anker der Andacht"
stelle: "Bibelstelle des Hauptverses, z. B. Johannes 3,16"
beschreibung: "1–2 Sätze Kurzzusammenfassung für Vorschau/Suchmaschinen"
schlagwoerter: ["3-6 thematische Schlagworte"]
---

[Fließtext der Andacht: 250–450 Wörter, in Absätze gegliedert. Ein
Hauptbibelvers als roter Faden, weitere Verse dürfen zitiert/benannt werden.
Bei Themen mit mehreren praktischen Punkten sind auch "## Zwischenüberschrift"
und **Fettungen** erlaubt – aber nur, wenn es der Sache dient, nicht als
Standard.]

## Regel für Vers-für-Vers-Serien
Falls ich angebe, dass die Andacht Teil einer fortlaufenden Kapitel-Serie
ist: Nimm NICHTS von noch nicht behandelten Folgeversen vorweg. Du darfst
nur auf den heutigen Vers, bereits behandelte frühere Verse derselben Serie
und den unmittelbaren Kontext davor eingehen – nicht auf das, was danach
im Kapitel kommt, auch wenn es inhaltlich naheliegt.

## Was ich dir jetzt gebe
- Bibelstelle/Hauptvers: [...]
- Einzelandacht oder Teil einer Serie? Wenn Serie: welche, welcher Vers, was
  wurde in den vorherigen Teilen bereits behandelt: [...]
- Optional: Gedanke/Fokus/Erfahrung, die ich einbringen möchte: [...]
- Optional: gewünschte Länge/Format (Standard-Fließtext oder Themen-Serie
  mit Gliederungspunkten): [...]
```

---

## Hinweis zu den Namen

„André Töfs“, „Andreas Pauvillier“ und „Kurt Schneck“ habe ich unverändert
aus deiner Nachricht übernommen – bei „Roger Libby“ bin ich mir relativ
sicher, dass **Roger Liebi** gemeint ist, und habe das oben entsprechend
geschrieben. Wenn eine der anderen Schreibweisen nicht stimmt, sag kurz
Bescheid, dann korrigiere ich die Datei.

## Bibelübersetzung

Festgelegt: **Schlachter 2000** oder **Elberfelder CSV Hückeswagen**, beide
gleichwertig zulässig, aber pro Andacht einheitlich.

## Herkunft der Struktur-Vorgaben

- Frontmatter-Felder `titel`/`losung`/`stelle`/`beschreibung`/`schlagwoerter`
  und das optionale `frage`-Feld ("Frage für heute"-Kasten) stammen direkt aus
  `src/_includes/andacht.njk` bzw. `andachten-archiv/README.md` – das sind
  die tatsächlich von der Website unterstützten Felder.
- Wortzahl, Frageton, sparsamer Ausrufezeichen-Einsatz und Zitierweise sind
  aus der Analyse der 111 veröffentlichten Andachten sowie der 663
  Rohmaterial-Einträge destilliert (siehe Chat-Verlauf).
