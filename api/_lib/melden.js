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
const { beanspruche, gibFrei } = require("./merker");
const { sendeTelegramAndacht } = require("./telegram");
const SITE = require("../../src/_data/site.js");

const ORDNER = "src/andachten";
const STATUS_DATEI = "telegram-gesendet.json";
// Wie viele Tage rückwirkend eine fällige Andacht noch gemeldet werden darf.
// Fängt ausgefallene Cron-Läufe (z. B. Wochenende) ab, verhindert aber, dass
// nachträglich eingepflegte alte Archiv-Andachten den Kanal fluten.
const MELDE_FENSTER_TAGE = 3;
// Zwei getrennte Morgen-Zeitpunkte (deutscher Zeit):
//   SICHTBAR_AB_STUNDE – ab wann eine vordatierte Andacht ONLINE (sichtbar) wird.
//     Bewusst früh (4 Uhr), damit sie – auch bei einem leicht verspäteten Lauf –
//     zuverlässig VOR 6 Uhr online steht (für Frühaufsteher). Muss zur gleichen
//     Konstante im Build-Filter (src/andachten/andachten.11tydata.js) passen.
//   MELDE_STUNDE – ab wann die automatischen Meldungen (Telegram/Newsletter)
//     rausgehen. Später (6 Uhr), damit Abonnenten keine sehr frühe Morgen-Nachricht
//     bekommen; der Link zeigt dann bereits die fertig gebaute Seite.
const SICHTBAR_AB_STUNDE = 4;
const MELDE_STUNDE = 6;

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
// aus src/andachten/andachten.11tydata.js: an ihrem Tag erst ab SICHTBAR_AB_STUNDE
// (4 Uhr), davor (und an künftigen Tagen) noch nicht; an vergangenen Tagen längst.
function istFaelligJetzt(datum, heute, stunde) {
  if (datum > heute) return false;
  if (datum < heute) return true;
  return stunde >= SICHTBAR_AB_STUNDE;
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

// --- Vor dem Melden warten, bis die Seite ONLINE ist ------------------------
// Der gewünschte Look ist die Link-Vorschaukarte (Titel, Kurztext, Bild). Die
// baut Telegram nur, wenn die Andachtsseite beim Versand schon öffentlich
// erreichbar ist. Deshalb warten wir hier, bis die (evtl. neu gebaute) Seite mit
// HTTP 200 antwortet, und melden ERST DANN – so entsteht zuverlässig die schöne
// Vorschaukarte unter der Nachricht.
//
// Ist die Seite im Wartebudget nicht erreichbar (Build dauert ausnahmsweise
// länger als das Zeitlimit der Serverless-Funktion), wird trotzdem gemeldet –
// dann ohne Vorschaukarte, aber die Nachricht selbst (fetter Titel, Kurztext und
// verlinktes „mehr lesen...") kommt vollständig an. So bleibt eine Meldung nie
// ganz aus und ist nie nur ein nackter Link.
//
// Das Budget bleibt klar unter dem Vercel-Funktions-Zeitlimit (maxDuration 60 s,
// siehe vercel.json), damit nach dem Warten noch genug Zeit zum Senden bleibt.
const ERREICHBAR_MAX_WARTE_MS = 40000; // Wartebudget, bis die Seite online ist
const ERREICHBAR_ABSTAND_MS = 3000; // Pause zwischen zwei Versuchen
const ERREICHBAR_ANFRAGE_TIMEOUT_MS = 6000; // Zeitlimit je Einzel-Abruf
// Kurze Zusatzpause, nachdem die Seite erstmals mit 200 antwortet: gibt der
// Auslieferung (CDN/Deployment) einen Moment, damit auch Telegrams Vorschau-
// Crawler die fertige Seite mit allen OG-Tags sieht.
const NACH_ONLINE_WARTE_MS = 3000;

// Einzelner Abruf: true bei HTTP 200–299. Netzwerkfehler/Timeout ergeben false.
async function istErreichbar(url, timeoutMs = ERREICHBAR_ANFRAGE_TIMEOUT_MS) {
  const controller = new AbortController();
  const stopp = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Cache-Buster + no-cache, damit kein zwischengespeichertes 404 die Prüfung
    // verfälscht, sobald die neue Version wirklich live ist.
    const trenn = url.includes("?") ? "&" : "?";
    const res = await fetch(`${url}${trenn}_=${Date.now()}`, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "cache-control": "no-cache" },
    });
    try {
      await (res.body && res.body.cancel && res.body.cancel());
    } catch {
      /* Body nicht benötigt */
    }
    return res.ok;
  } catch {
    return false; // noch nicht erreichbar (Timeout/Netzwerkfehler)
  } finally {
    clearTimeout(stopp);
  }
}

// Wartet, bis die URL öffentlich erreichbar ist (HTTP 200), und gibt dann true
// zurück; sonst false nach Ablauf des Wartebudgets. Ist die Adresse nicht absolut
// (kein http/https – etwa weil site.url fehlt), lässt sie sich nicht prüfen; dann
// wird true angenommen, um das Melden nicht dauerhaft zu blockieren.
//
// Sobald die Seite erstmals mit 200 antwortet, wird noch eine kurze Zusatzpause
// (NACH_ONLINE_WARTE_MS) eingelegt, bevor true zurückkommt – damit auch Telegrams
// Vorschau-Crawler die frisch ausgelieferte Seite zuverlässig erreicht.
async function warteBisErreichbar(
  url,
  {
    maxWarteMs = ERREICHBAR_MAX_WARTE_MS,
    abstandMs = ERREICHBAR_ABSTAND_MS,
    nachOnlineMs = NACH_ONLINE_WARTE_MS,
  } = {}
) {
  if (!/^https?:\/\//i.test(String(url))) return true;
  const bis = Date.now() + maxWarteMs;
  for (;;) {
    if (await istErreichbar(url)) {
      if (nachOnlineMs > 0) await new Promise((r) => setTimeout(r, nachOnlineMs));
      return true;
    }
    if (Date.now() + abstandMs >= bis) return false;
    await new Promise((r) => setTimeout(r, abstandMs));
  }
}

// Kurztext (Beschreibung) einer Andacht – identisch zu og:description der Seite
// (siehe src/_includes/base.njk): das Feld „beschreibung", sonst die allgemeine
// Seitenbeschreibung. So enthält die Meldung IMMER einen Kurztext.
function kurztext(felder) {
  return String((felder && felder.beschreibung) || SITE.beschreibung || "").trim();
}

// HTML-Sonderzeichen maskieren, damit ein Titel/Kurztext mit <, > oder & die
// Telegram-HTML-Formatierung (parse_mode "HTML") nicht durcheinanderbringt.
function htmlEscape(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Nachricht für eine Andacht als HTML (parse_mode "HTML"):
//   • Titel in FETTER Schrift
//   • darunter der normale Kurztext (Teaser), falls vorhanden
//   • ein blau verlinktes „mehr lesen..." statt eines nackten Links
// Ist die Seite beim Versand schon online, baut Telegram darunter zusätzlich die
// Link-Vorschaukarte (Titel, Kurztext, Bild) aus den OG-Tags der Seite.
function baueNachricht({ datum, slug, felder }) {
  const titel = htmlEscape((felder && felder.titel) || slug);
  const text = htmlEscape(kurztext(felder));
  // URL fürs href-Attribut absichern (& über htmlEscape, zusätzlich ").
  const url = htmlEscape(andachtUrl(datum, slug)).replace(/"/g, "&quot;");
  const link = `<a href="${url}">mehr lesen...</a>`;
  return text ? `<b>${titel}</b>\n\n${text}\n\n${link}` : `<b>${titel}</b>\n\n${link}`;
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

// Prüft, ob JETZT ein Neu-Bau der Seite (Vercel Deploy Hook) nötig ist: Gibt es
// eine bereits fällige (sichtbare), veröffentlichte Andacht, deren Seite noch NICHT
// online erreichbar ist? Nur dann lohnt ein Neu-Bau. Ist heute schon alles online,
// liefert die Prüfung false. So darf der Endpunkt beliebig oft aufgerufen werden
// (z. B. mehrfach im Morgenfenster durch einen externen Pinger), ohne bei jedem
// Aufruf ein überflüssiges Deployment auszulösen.
async function neubauNoetig() {
  const heute = heuteBerlin();
  const stunde = stundeBerlin();
  const frueheste = verschiebeTage(heute, -MELDE_FENSTER_TAGE);
  const kandidaten = (await listeAndachten()).filter(
    (a) => a.datum >= frueheste && istFaelligJetzt(a.datum, heute, stunde)
  );
  for (const a of kandidaten) {
    const url = andachtUrl(a.datum, a.slug);
    // Ohne absolute Adresse (site.url fehlt) lässt sich nichts prüfen -> sicher-
    // heitshalber bauen.
    if (!/^https?:\/\//i.test(url)) return true;
    if (await istErreichbar(url, 6000)) continue; // schon online -> kein Bau nötig
    // Noch nicht online: Entwürfe sollen versteckt bleiben (kein Bau deswegen).
    const file = await getFile(`${ORDNER}/${a.datei}`);
    if (file && frontMatterFelder(file.content).entwurf === true) continue;
    return true; // fällige, veröffentlichte Andacht ist (noch) nicht online -> Bau nötig
  }
  return false;
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

  const gemeldet = [];
  for (const a of kandidaten) {
    const file = await getFile(`${ORDNER}/${a.datei}`);
    if (!file) continue;
    const felder = frontMatterFelder(file.content);
    // Entwürfe werden nicht gemeldet (und nicht als gesendet vermerkt, damit sie
    // nach dem Veröffentlichen noch gemeldet werden können).
    if (felder.entwurf === true) continue;
    // Warten, bis die Seite online ist (dann baut Telegram die schöne Vorschau-
    // karte). Wird sie im Budget nicht erreichbar, geht die Meldung ohne Karte
    // raus – Titel, Kurztext und Link kommen trotzdem an (nie nur ein nackter
    // Link). Bewusst VOR dem Beanspruchen, damit das Warten nicht in das
    // Zeitfenster zwischen "beansprucht" und "gesendet" fällt.
    const seiteOnline = await warteBisErreichbar(andachtUrl(a.datum, a.slug));
    // WICHTIG: Erst ATOMAR beanspruchen, dann senden. So kann bei zwei
    // gleichzeitigen Läufen nur einer diese Andacht melden – der andere sieht den
    // Anspruch und überspringt (kein Doppel-Post).
    const zuschlag = await beanspruche(
      STATUS_DATEI,
      a.datei,
      `Telegram: Andacht gemeldet (${a.datei})`
    );
    if (!zuschlag) continue; // anderer Lauf meldet diese Andacht bereits
    try {
      await sendeTelegramAndacht({
        nachricht: baueNachricht({ datum: a.datum, slug: a.slug, felder }),
        seiteOnline,
      });
      gemeldet.push(a.datei);
    } catch (e) {
      // Versand fehlgeschlagen -> Anspruch zurücknehmen, damit der nächste Lauf es
      // im 3-Tage-Fenster erneut versucht (keine Meldung geht dauerhaft verloren).
      await gibFrei(STATUS_DATEI, a.datei, `Telegram-Anspruch zurückgenommen (${a.datei})`);
      throw e;
    }
  }

  return { ersteEinrichtung: false, gemeldet: gemeldet.length, dateien: gemeldet };
}

// --- Weg 3: Manuell aus dem Admin ("noch mal per Telegram melden") ----------
// Meldet EINE bereits veröffentlichte Andacht auf ausdrücklichen Wunsch erneut –
// als Absicherung, falls der automatische Versand beim Veröffentlichen einmal
// nicht angekommen ist. Anders als Weg 2 wird bewusst auch dann gesendet, wenn
// die Andacht schon als "gemeldet" vermerkt ist ("noch mal" anstoßen).
//
// WICHTIG (Wunsch): Der Versand geschieht NUR, wenn die Andacht tatsächlich schon
// online ist – also fällig (nicht Entwurf, Datum erreicht) UND die öffentliche
// Adresse mit HTTP 200 antwortet. Sonst wird mit einer klaren Meldung abgelehnt,
// damit kein Telegram-Link auf eine (noch) nicht existierende Seite verweist.
async function meldeManuell({ datei }) {
  const safe = String(datei || "");
  const m = safe.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.md$/);
  if (!m) {
    const e = new Error("Ungültiger Dateiname der Andacht.");
    e.status = 400;
    throw e;
  }
  const datum = m[1];
  const slug = m[2];

  const file = await getFile(`${ORDNER}/${safe}`);
  if (!file) {
    const e = new Error("Andacht nicht gefunden.");
    e.status = 404;
    throw e;
  }
  const felder = frontMatterFelder(file.content);
  if (felder.entwurf === true) {
    const e = new Error(
      "Das ist noch ein Entwurf und nicht öffentlich. Bitte zuerst veröffentlichen."
    );
    e.status = 409;
    throw e;
  }

  // 1. Fällig? (Datum erreicht, an seinem Tag ab der Sichtbar-Stunde deutscher Zeit.)
  const heute = heuteBerlin();
  if (!istFaelligJetzt(datum, heute, stundeBerlin())) {
    const e = new Error(
      `Diese Andacht ist noch nicht veröffentlicht – sie erscheint erst an ihrem Tag um ${SICHTBAR_AB_STUNDE} Uhr.`
    );
    e.status = 409;
    throw e;
  }

  // 2. Wirklich online? Ein einzelner, zeitlich begrenzter Abruf der echten
  //    Adresse. Antwortet sie nicht mit 200 (Build noch nicht fertig, Seite
  //    nicht erreichbar), wird NICHT gemeldet – der Nutzer kann es kurz später
  //    erneut versuchen.
  const url = andachtUrl(datum, slug);
  if (!/^https?:\/\//i.test(url)) {
    const e = new Error(
      "Die öffentliche Adresse ist nicht konfiguriert (site.url), Online-Prüfung nicht möglich."
    );
    e.status = 500;
    throw e;
  }
  const online = await istErreichbar(url, 7000);
  if (!online) {
    const e = new Error(
      "Die Andacht ist gerade nicht online erreichbar. Bitte in 1–2 Minuten (nach dem Neu-Bau der Seite) erneut versuchen."
    );
    e.status = 409;
    throw e;
  }

  // 3. Senden. Die Seite ist oben bereits als online (HTTP 200) bestätigt, also
  //    kommt die Nachricht (fetter Titel, Kurztext, „mehr lesen...") mit der
  //    Link-Vorschaukarte (Bild aus der Seite) an.
  await sendeTelegramAndacht({
    nachricht: baueNachricht({ datum, slug, felder }),
    seiteOnline: true,
  });

  // 4. Merker pflegen, damit der tägliche Lauf nicht zusätzlich meldet.
  const status = await ladeStatus();
  if (!status.vorhanden) {
    // Noch kein Merker: gesamten fälligen Bestand als bekannt verbuchen (Flut-
    // Schutz) und diese Andacht mit aufnehmen.
    const alle = await listeAndachten();
    const bestand = alle.filter((a) => a.datum <= heute).map((a) => a.datei);
    if (!bestand.includes(safe)) bestand.push(safe);
    await speichereStatus(
      bestand,
      undefined,
      `Telegram-Status initialisiert + Andacht manuell gemeldet (${safe})`
    );
  } else if (!status.gesendet.includes(safe)) {
    const gesendet = status.gesendet.slice();
    gesendet.push(safe);
    await speichereStatus(gesendet, status.sha, `Telegram: Andacht manuell gemeldet (${safe})`);
  }
  // War sie bereits vermerkt, bleibt der Merker unverändert – erneut gesendet
  // wurde trotzdem (bewusstes "noch mal").

  return { ok: true, gemeldet: 1, datei: safe, url };
}

// --- Weg 2: Sofort beim Veröffentlichen -----------------------------------
// Meldet EINE gerade veröffentlichte Andacht, aber nur wenn sie jetzt bereits
// öffentlich sichtbar ist (an ihrem Tag ab der Sichtbar-Stunde). Vorgeplante
// (künftige) und noch nicht sichtbare Andachten werden bewusst NICHT gemeldet –
// die übernimmt weiterhin der tägliche Lauf (Meldung ab MELDE_STUNDE / 6 Uhr).
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

  // Warten, bis die neu gebaute Seite online ist – dann baut Telegram die schöne
  // Vorschaukarte (Titel, Kurztext, Bild). Wird sie im Budget nicht erreichbar
  // (Build dauert ausnahmsweise länger), geht die Meldung ohne Karte raus –
  // Titel, Kurztext und „mehr lesen..."-Link kommen trotzdem an, nie nur ein
  // nackter Link.
  const seiteOnline = await warteBisErreichbar(andachtUrl(datum, slug));

  // Erst ATOMAR beanspruchen, dann senden: verhindert eine Doppelmeldung, falls
  // der tägliche Lauf dieselbe Andacht zeitgleich meldet. Sieht ein anderer Lauf
  // die Andacht bereits als beansprucht, wird hier nichts gesendet.
  const zuschlag = await beanspruche(STATUS_DATEI, datei, `Telegram: Andacht gemeldet (${datei})`);
  if (!zuschlag) {
    return { uebersprungen: true, grund: "bereits-gemeldet" };
  }
  try {
    await sendeTelegramAndacht({
      nachricht: baueNachricht({ datum, slug, felder }),
      seiteOnline,
    });
  } catch (e) {
    await gibFrei(STATUS_DATEI, datei, `Telegram-Anspruch zurückgenommen (${datei})`);
    throw e;
  }
  return { gemeldet: 1, datei };
}

module.exports = {
  SICHTBAR_AB_STUNDE,
  MELDE_STUNDE,
  MELDE_FENSTER_TAGE,
  heuteBerlin,
  stundeBerlin,
  verschiebeTage,
  istFaelligJetzt,
  imMeldefenster,
  andachtUrl,
  basisUrl,
  istErreichbar,
  warteBisErreichbar,
  baueNachricht,
  kurztext,
  frontMatterFelder,
  listeAndachten,
  neubauNoetig,
  meldeFaelligeAndachten,
  meldeAndachtFallsFaellig,
  meldeManuell,
};
