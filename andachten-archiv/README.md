# Andachten-Archiv (Rohmaterial)

Dieser Ordner ist die **Sammelstelle für das bereits vorhandene Archiv** älterer
Andachten. Hier landet zunächst der Rohtext – so, wie er kommt. Von hier aus
werden die einzelnen Andachten nach und nach in die eigentliche Website
([`src/andachten/`](../src/andachten/)) übernommen.

Wichtig: Dieser Ordner ist **kein Teil der gebauten Website**. Er liegt bewusst
außerhalb von `src/`, damit Eleventy ihn beim Bauen ignoriert. Nichts hier drin
erscheint online, bevor es nicht als richtige Andacht nach `src/andachten/`
umgezogen ist.

---

## So kommt das Archiv hier rein

1. **Text schicken:** Du fügst dein bestehendes Archiv einfach als Text in die
   Session ein (Copy & Paste) – am Stück oder in mehreren Teilen, ganz egal in
   welchem Format (durchgehender Text, mit Überschriften, mit Datumsangaben …).
2. **Zusammenbündeln:** Claude legt den Text hier im Ordner ab – bei vielen
   Einträgen sinnvoll aufgeteilt (z. B. eine Datei pro Jahr oder pro Monat) und
   mit einer Übersicht, damit man sich zurechtfindet.
3. **Aufräumen:** Anschließend lässt sich das Rohmaterial Schritt für Schritt in
   sauber formatierte Einzel-Andachten überführen (siehe unten). Das Rohmaterial
   bleibt als Sicherung erhalten, bis alles übertragen ist.

Solange noch nichts eingefügt wurde, ist der Ordner absichtlich leer (bis auf
diese Anleitung).

---

## Ziel-Format einer fertigen Andacht

Jede fertige Andacht wird eine eigene Markdown-Datei in
[`src/andachten/`](../src/andachten/). Dateiname nach dem Muster:

```
JAHR-MONAT-TAG-kurzer-titel.md
```

Beispiel: `2025-12-24-heiligabend.md`. Das Datum am Anfang bestimmt die
Einsortierung im Archiv (neueste zuerst).

Aufbau der Datei:

```markdown
---
titel: Überschrift der Andacht
losung: „Der Bibelvers / das Leitwort.“
stelle: Bibelstelle, z. B. Psalm 37,5
beschreibung: Kurzer Vorschautext für Suchmaschinen und geteilte Links.
---

Hier steht der eigentliche Text der Andacht. Ein leerer Absatz trennt Absätze,
für Fettdruck **so**.

**Gebet:** Ein kurzes Abschlussgebet.
```

Bedeutung der Felder:

| Feld           | Pflicht | Bedeutung                                              |
| -------------- | ------- | ----------------------------------------------------- |
| `titel`        | ja      | Überschrift der Andacht                               |
| `losung`       | nein    | Bibelvers / Leitwort (wird hervorgehoben)             |
| `stelle`       | nein    | Bibelstelle zur Losung, z. B. `Psalm 37,5`            |
| `beschreibung` | nein    | kurzer Vorschautext für Suchmaschinen / geteilte Links |

> Fehlt bei einem alten Eintrag das genaue Datum, ist das kein Problem: Dann
> wird beim Übertragen ein sinnvolles Datum vergeben (oder gemeinsam eins
> festgelegt).
