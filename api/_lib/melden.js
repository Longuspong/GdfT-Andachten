// Gemeinsame Melde-Logik für Telegram – genutzt von zwei Stellen:
//   1. api/taeglich.js  – der tägliche Cron-Lauf meldet die an diesem Tag um
//      6 Uhr fällig gewordenen (vorgeplanten) Andachten.
//   2. api/andachten.js – beim Veröffentlichen im Admin: ist die Andacht sofort
//      sichtbar (Datum heute und schon nach 6 Uhr, oder Datum in der
//      Vergangenheit), wird sie direkt gemeldet – statt erst am nächsten Morgen
//      (das vermied früher eine Dopplung mit der geplanten Morgen-Andacht).
//
// Beide Wege teilen sich denselben "schon gemeldet"-Merker (telegram-gesendet.json
// im Repo). Dadurch wird jede Andacht GENAU EINMAL gemeldet, egal über welchen
// Weg sie fällig wird.

const { listDir, getFile, putFile } = require("./github");
const { sendeTelegram } = require("./telegram");
const SITE = require("../../src/_data/site.js");

const ORDNER = "src/andachten";
const STATUS_DATEI = "telegram-gesendet.json";
// Wie viele Tage rückwirkend eine fällige Andacht noch gemeldet werden darf.
// Fängt ausgefallene Cron-Läufe (z. B. Wochenende) ab, verhindert aber, dass
// nachträglich eingepflegte alte Archiv-Andachten den Kanal fluten.
const MELDE_FENSTER_TAGE = 3;
// Vor dieser Uhrzeit (deutscher Zeit) wird nichts veröffentlicht/gemeldet.
// Muss zur gleichen Konstante im Build-Filter passen
// (src/andachten/andachten.11tydata.js), damit "sichtbar" und "gemeldet"
// zum selben Zeitpunkt passieren.
const VEROEFFENTLICHUNGS_STUNDE = 6;

// Heutiges Datum als "JJJJ-MM-TT" in deutscher Zeit (Europe/Berlin).
function heuteBerlin() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Aktuelle Stunde (0–23) in deutscher Zeit (Europe/Berlin).
function stundeBerlin() {
  const teile = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const stunde = teile.find((t) => t.type === "hour");
  return stunde ? Number(stunde.value) : 0;
}

// Kalenderdatum ("JJJJ-MM-TT") um eine Anzahl Tage verschieben.
function verschiebeTage(iso, tage) {
  const [j, m, t] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(j, m - 1, t));
  d.setUTCDate(d.getUTCDate() + tage);
  return d.toISOString().slice(0, 10);
}

// Ist die Andacht JETZT fällig (also öffentlich sichtbar)? Spiegelt die Logik
// aus src/andachten/andachten.11tydata.js: an ihrem Tag erst ab 6 Uhr, davor
// (und an künftigen Tagen) noch nicht; an vergangenen Tagen längst.
function istFaelligJetzt(datum, heute, stunde) {
  if (datum > heute) return false;
  if (datum < heute) return true;
  return stunde >= VEROEFFENTLICHUNGS_STUNDE;
}

// Liegt das Datum im Meldefenster (nicht älter als MELDE_FENSTER_TAGE Tage)?
function imMeldefenster(datum, heute) {
  return datum >= verschiebeTage(heute, -MELDE_FENSTER_TAGE) && datum <= heute;
}

// Basis-Adresse der Seite ohne abschließenden Schrägstrich.
function basisUrl() {
  return String(SITE.url || "").replace(/\/+$/, "");
}

// Öffentliche Adresse einer Andacht (passend zu andachten.11tydata.js).
function andachtUrl(datum, slug) {
  return `${basisUrl()}/andachten/${datum}/${slug}/`;
}

// Telegram-Nachricht für eine Andacht bauen: nur der Titel, darunter der Link
// (Telegram zeigt darüber automatisch eine Vorschaukarte der Seite).
function baueNachricht({ datum, slug, felder }) {
  const titel = (felder && felder.titel) || slug;
  return `${titel}\n${andachtUrl(datum, slug)}`;
}

// Nur die benötigten Front-Matter-Felder lesen (titel, entwurf …). Bewusst
// schlank – kein YAML-Paket nötig (wie in api/andachten.js).
function frontMatterFelder(raw) {
  const match = String(raw).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const felder = {};
  if (!match) return felder;
  match[1].split(/\r?\n/).forEach((zeile) => {
    const m = zeile.match(/^([A-Za-zÄÖÜäöüß_]+):\s*(.*)$/);
    if (!m) return;
    let wert = m[2].trim();
    if (wert === "true") wert = true;
    else if (wert === "false") wert = false;
    else if (wert.startsWith('"') || wert.startsWith("[")) {
      try {
        wert = JSON.parse(wert);
      } catch {
        /* Rohwert behalten */
      }
    }
    felder[m[1]] = wert;
  });
  return felder;
}

// Alle Andachten-Dateinamen mit Datum + Slug (ohne Inhalt zu laden).
async function listeAndachten() {
  const eintraege = (await listDir(ORDNER)).filter(
    (i) => i.type === "file" && i.name.endsWith(".md")
  );
  return eintraege
    .map((i) => {
      const m = i.name.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.md$/);
      return m ? { datei: i.name, datum: m[1], slug: m[2] } : null;
    })
    .filter(Boolean);
}

// Status (bereits gemeldete Dateinamen) laden.
async function ladeStatus() {
  const datei = await getFile(STATUS_DATEI);
  if (!datei) return { vorhanden: false, sha: undefined, gesendet: [] };
  let gesendet = [];
  try {
    gesendet = JSON.parse(datei.content).gesendet || [];
  } catch {
    gesendet = [];
  }
  return { vorhanden: true, sha: datei.sha, gesendet };
}

// Status speichern.
async function speichereStatus(gesendet, sha, nachricht) {
  await putFile(
    STATUS_DATEI,
    JSON.stringify({ gesendet }, null, 2) + "\n",
    nachricht,
    sha
  );
}

// Ersteinrichtung: den gesamten bereits fälligen Bestand als "gemeldet"
// verbuchen, ohne rückwirkend zu posten (sonst flutet das Archiv den Kanal).
async function initStatusMitBestand(alle, heute) {
  const bestand = alle.filter((a) => a.datum <= heute).map((a) => a.datei);
  await speichereStatus(
    bestand,
    undefined,
    "Telegram-Status initialisiert (Bestand nicht rückwirkend gemeldet)"
  );
  return { ersteEinrichtung: true, gemerkt: bestand.length, gemeldet: 0 };
}

// --- Weg 1: Batch (täglicher Cron-Lauf) -----------------------------------
// Alle im Meldefenster fällig gewordenen, noch nicht gemeldeten Andachten posten.
async function meldeFaelligeAndachten() {
  const heute = heuteBerlin();
  const status = await ladeStatus();
  const alle = await listeAndachten();

  if (!status.vorhanden) {
    return initStatusMitBestand(alle, heute);
  }

  const frueheste = verschiebeTage(heute, -MELDE_FENSTER_TAGE);
  const kandidaten = alle
    .filter(
      (a) =>
        a.datum <= heute &&
        a.datum >= frueheste &&
        !status.gesendet.includes(a.datei)
    )
    .sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0));

  const gesendet = status.gesendet.slice();
  const gemeldet = [];
  for (const a of kandidaten) {
    const file = await getFile(`${ORDNER}/${a.datei}`);
    if (!file) continue;
    const felder = frontMatterFelder(file.content);
    // Entwürfe werden nicht gemeldet (und nicht als gesendet vermerkt, damit sie
    // nach dem Veröffentlichen noch gemeldet werden können).
    if (felder.entwurf === true) continue;
    await sendeTelegram(baueNachricht({ datum: a.datum, slug: a.slug, felder }));
    gesendet.push(a.datei);
    gemeldet.push(a.datei);
  }

  if (gemeldet.length) {
    await speichereStatus(
      gesendet,
      status.sha,
      `Telegram: ${gemeldet.length} Andacht(en) gemeldet`
    );
  }
  return { ersteEinrichtung: false, gemeldet: gemeldet.length, dateien: gemeldet };
}

// --- Weg 2: Sofort beim Veröffentlichen -----------------------------------
// Meldet EINE gerade veröffentlichte Andacht, aber nur wenn sie jetzt bereits
// öffentlich sichtbar ist. Vorgeplante (künftige) und vor-6-Uhr-Andachten werden
// bewusst NICHT gemeldet – die übernimmt weiterhin der tägliche 6-Uhr-Lauf.
//
//   datei      Dateiname der (neuen) Andacht, z. B. "2026-09-11-hoffnung.md"
//   datum      "JJJJ-MM-TT"
//   slug       Slug-Teil des Dateinamens
//   felder     { titel, entwurf }
//   alterName  optional: bisheriger Dateiname bei einer Umbenennung (Datum/Titel
//              geändert). Verhindert, dass eine bereits gemeldete Andacht nach
//              dem Umbenennen erneut (über den Cron) gemeldet wird.
async function meldeAndachtFallsFaellig({ datei, datum, slug, felder, alterName }) {
  if (felder && felder.entwurf === true) {
    return { uebersprungen: true, grund: "entwurf" };
  }

  const status = await ladeStatus();

  // Noch kein Merker vorhanden -> wie der erste Cron-Lauf verfahren: Bestand als
  // bekannt verbuchen, aber nichts rückwirkend posten (Flut-Schutz). Die Andacht
  // gilt damit als bekannt und wird nicht extra gepostet.
  if (!status.vorhanden) {
    const alle = await listeAndachten();
    await initStatusMitBestand(alle, heuteBerlin());
    return { uebersprungen: true, grund: "erste-einrichtung" };
  }

  // Schon gemeldet? Dann nichts tun.
  if (status.gesendet.includes(datei)) {
    return { uebersprungen: true, grund: "bereits-gemeldet" };
  }

  // Umbenennung einer bereits gemeldeten Andacht: Merker vom alten auf den neuen
  // Dateinamen umziehen, damit der Cron sie nicht als "neu" erneut meldet.
  if (alterName && status.gesendet.includes(alterName)) {
    const gesendet = status.gesendet.filter((n) => n !== alterName);
    gesendet.push(datei);
    await speichereStatus(gesendet, status.sha, `Telegram-Merker umbenannt: ${datei}`);
    return { uebersprungen: true, grund: "umbenannt-bereits-gemeldet" };
  }

  // Nur melden, wenn jetzt schon sichtbar und im Meldefenster.
  const heute = heuteBerlin();
  if (!imMeldefenster(datum, heute) || !istFaelligJetzt(datum, heute, stundeBerlin())) {
    return { uebersprungen: true, grund: "noch-nicht-faellig" };
  }

  await sendeTelegram(baueNachricht({ datum, slug, felder }));
  const gesendet = status.gesendet.filter((n) => n !== alterName);
  gesendet.push(datei);
  await speichereStatus(gesendet, status.sha, `Telegram: Andacht gemeldet (${datei})`);
  return { gemeldet: 1, datei };
}

module.exports = {
  VEROEFFENTLICHUNGS_STUNDE,
  MELDE_FENSTER_TAGE,
  heuteBerlin,
  stundeBerlin,
  verschiebeTage,
  istFaelligJetzt,
  andachtUrl,
  baueNachricht,
  meldeFaelligeAndachten,
  meldeAndachtFallsFaellig,
};
