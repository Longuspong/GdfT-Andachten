// Täglicher Lauf – wird von einem Vercel-Cron-Job aufgerufen (siehe vercel.json).
//
// Zwei Aufgaben:
//   1. Neu-Bau anstoßen: Vordatierte Andachten (Datum in der Zukunft) werden beim
//      Bauen ausgeblendet (siehe src/andachten/andachten.11tydata.js). Damit eine
//      solche Andacht an ihrem Tag von selbst erscheint, muss die Seite an diesem
//      Tag neu gebaut werden. Dazu wird ein Vercel "Deploy Hook" aufgerufen.
//   2. Telegram-Meldung: Neu fällige Andachten (Datum erreicht/überschritten,
//      noch nicht gemeldet) werden einmalig in den Telegram-Kanal gepostet.
//
// Es gibt keine Datenbank. Welche Andachten bereits gemeldet wurden, merkt sich
// die Datei telegram-gesendet.json im Repo (Wurzel, also außerhalb von src/ –
// damit sie NICHT Teil der gebauten Website ist).

const { listDir, getFile, putFile } = require("./_lib/github");
const { telegramAktiv, sendeTelegram } = require("./_lib/telegram");
const SITE = require("../src/_data/site.js");

const ORDNER = "src/andachten";
const STATUS_DATEI = "telegram-gesendet.json";
// Wie viele Tage rückwirkend eine fällige Andacht noch gemeldet werden darf.
// Fängt ausgefallene Cron-Läufe (z. B. Wochenende) ab, verhindert aber, dass
// nachträglich eingepflegte alte Archiv-Andachten den Kanal fluten.
const MELDE_FENSTER_TAGE = 3;
// Vor dieser Uhrzeit (deutscher Zeit) wird nichts veröffentlicht/gemeldet.
// Muss zur gleichen Konstante im Build-Filter passen
// (src/andachten/andachten.11tydata.js), damit "sichtbar" und "gemeldet"
// zum selben Zeitpunkt passieren. Siehe auch die zwei Cron-Zeiten in vercel.json.
const VEROEFFENTLICHUNGS_STUNDE = 6;

// Heutiges Datum als "JJJJ-MM-TT" in deutscher Zeit (Europe/Berlin) – gleiche
// Logik wie im Build-Filter, damit "fällig" und "sichtbar" zusammenpassen.
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

// Kalenderdatum ("JJJJ-MM-TT") um eine Anzahl Tage verschieben (reine Datumsmathematik).
function verschiebeTage(iso, tage) {
  const [j, m, t] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(j, m - 1, t));
  d.setUTCDate(d.getUTCDate() + tage);
  return d.toISOString().slice(0, 10);
}

// Basis-Adresse der Seite ohne abschließenden Schrägstrich.
function basisUrl() {
  return String(SITE.url || "").replace(/\/+$/, "");
}

// Nur die benötigten Front-Matter-Felder lesen (titel, losung, stelle, entwurf).
// Bewusst schlank gehalten – kein YAML-Paket nötig (wie in api/andachten.js).
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

// Öffentliche Adresse einer Andacht (passend zu andachten.11tydata.js).
function andachtUrl(datum, slug) {
  return `${basisUrl()}/andachten/${datum}/${slug}/`;
}

// Telegram-Nachricht für eine Andacht bauen: nur der Titel, darunter der Link
// (Telegram zeigt darüber automatisch eine Vorschaukarte der Seite).
function baueNachricht({ datum, slug, felder }) {
  const titel = felder.titel || slug;
  return `${titel}\n${andachtUrl(datum, slug)}`;
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

// Neu fällige Andachten an Telegram melden.
async function meldeNeueAndachten() {
  const heute = heuteBerlin();
  const status = await ladeStatus();
  const alle = await listeAndachten();

  // Erste Einrichtung: den gesamten bereits fälligen Bestand als "gemeldet"
  // verbuchen, ohne rückwirkend zu posten (sonst flutet das Archiv den Kanal).
  if (!status.vorhanden) {
    const bestand = alle.filter((a) => a.datum <= heute).map((a) => a.datei);
    await speichereStatus(
      bestand,
      undefined,
      "Telegram-Status initialisiert (Bestand nicht rückwirkend gemeldet)"
    );
    return { ersteEinrichtung: true, gemerkt: bestand.length, gemeldet: 0 };
  }

  // Kandidaten: fällig (im Meldefenster) und noch nicht gemeldet.
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

// Neu-Bau der Seite anstoßen (Vercel Deploy Hook).
async function stosseNeubauAn() {
  const url = process.env.DEPLOY_HOOK_URL;
  if (!url) return { uebersprungen: true, grund: "DEPLOY_HOOK_URL nicht gesetzt." };
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    return { ok: false, status: res.status };
  }
  return { ok: true };
}

// Cron-Aufrufe absichern: Ist CRON_SECRET gesetzt, muss der Aufruf den passenden
// Authorization-Header mitbringen (Vercel-Cron sendet ihn automatisch, wenn die
// Variable im Projekt vorhanden ist). Ohne CRON_SECRET bleibt der Endpunkt offen.
function autorisiert(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = (req.headers && req.headers.authorization) || "";
  return auth === `Bearer ${secret}`;
}

module.exports = async (req, res) => {
  if (!autorisiert(req)) {
    res.status(401).json({ error: "Nicht autorisiert." });
    return;
  }

  // Uhrzeit-Sperre: erst ab 6 Uhr deutscher Zeit veröffentlichen/melden. Die
  // zwei Cron-Zeiten (04:00 & 05:00 UTC) sorgen dafür, dass ganzjährig – trotz
  // Sommer-/Winterzeit – genau ein Lauf in die 6-Uhr-Stunde deutscher Zeit
  // fällt; der jeweils andere Lauf wird hier abgewiesen. Mit ?force=1 (nur
  // manuell, geschützt durch CRON_SECRET) lässt sich die Sperre zum Testen
  // umgehen.
  const erzwingen = req.query && (req.query.force === "1" || req.query.force === "true");
  if (!erzwingen && stundeBerlin() < VEROEFFENTLICHUNGS_STUNDE) {
    res.status(200).json({
      ok: true,
      uebersprungen: true,
      grund: `Vor ${VEROEFFENTLICHUNGS_STUNDE} Uhr (deutscher Zeit) – nichts zu tun.`,
      stundeBerlin: stundeBerlin(),
    });
    return;
  }

  const ergebnis = { neubau: null, telegram: null };
  try {
    // 1. Neu-Bau anstoßen (unabhängig von Telegram; darf den Lauf nicht abbrechen).
    try {
      ergebnis.neubau = await stosseNeubauAn();
    } catch (e) {
      ergebnis.neubau = { ok: false, fehler: e.message };
    }

    // 2. Telegram-Meldung (nur wenn konfiguriert).
    if (!telegramAktiv()) {
      ergebnis.telegram = { uebersprungen: true, grund: "Telegram nicht konfiguriert." };
    } else {
      ergebnis.telegram = await meldeNeueAndachten();
    }

    res.status(200).json({ ok: true, datum: heuteBerlin(), ...ergebnis });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || "Unbekannter Fehler.", ...ergebnis });
  }
};
