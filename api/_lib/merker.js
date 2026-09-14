// Gemeinsamer "genau-einmal"-Merker für Telegram (melden.js) und Newsletter
// (mailen.js).
//
// Beide Kanäle führen im Repo eine Status-Datei der Form
//   { "gesendet": [ "2026-09-14-anbetung-...md", ... ] }
// (telegram-gesendet.json bzw. newsletter-gesendet.json). Die Absicherung gegen
// DOPPELTE Zustellung bei GLEICHZEITIGEN Läufen steckt hier: eine Andacht wird
// ATOMAR beansprucht, BEVOR sie gesendet wird.
//
// Warum das nötig ist: Cron-/Aufruf-Systeme liefern in der Praxis oft
// "mindestens einmal" (Wiederholung, überlappende Zeitpläne, mehrere Auslöser).
// Das frühere Muster "erst senden, dann merken" konnte deshalb doppelt zustellen:
// Zwei Läufe lasen denselben Stand ("noch nicht gesendet"), sendeten beide und
// erst danach schrieb einer den Merker.
//
// Warum die atomare Beanspruchung reicht: GitHubs Contents-API schreibt nur, wenn
// der mitgegebene sha noch der aktuelle ist (Compare-and-Swap). Versuchen zwei
// Läufe gleichzeitig, DIESELBE Andacht einzutragen, gewinnt genau einer; der
// andere bekommt HTTP 409, liest neu, sieht den Eintrag und sendet NICHT.

const { getFile, putFile } = require("./github");

// Wie oft ein Schreibkonflikt (paralleler Lauf) neu versucht wird, bevor
// aufgegeben wird. Bewusst klein: im Zweifel lieber NICHT senden.
const MAX_VERSUCHE = 6;

// Ein 409 von GitHub bedeutet: der sha ist nicht mehr aktuell – ein anderer Lauf
// hat die Status-Datei zwischenzeitlich geändert.
function istKonflikt(e) {
  return Boolean(e && (e.status === 409 || /\(409\)/.test(String(e.message || ""))));
}

// Status-Datei { gesendet: [...] } lesen. Fehlt sie, gilt sie als "nicht vorhanden".
async function ladeGesendet(statusDatei) {
  const datei = await getFile(statusDatei);
  if (!datei) return { vorhanden: false, sha: undefined, gesendet: [] };
  let gesendet = [];
  try {
    gesendet = JSON.parse(datei.content).gesendet || [];
  } catch {
    gesendet = [];
  }
  return { vorhanden: true, sha: datei.sha, gesendet };
}

async function schreibeGesendet(statusDatei, gesendet, sha, nachricht) {
  await putFile(statusDatei, JSON.stringify({ gesendet }, null, 2) + "\n", nachricht, sha);
}

// Beansprucht eine Andacht ATOMAR als "wird gesendet", BEVOR gesendet wird.
//   true  -> Zuschlag erhalten: JETZT senden (und bei Sendefehler gibFrei aufrufen).
//   false -> ein anderer (gleichzeitiger) Lauf hat sie bereits beansprucht/gesendet
//            ODER die Status-Datei existiert noch nicht: NICHT senden.
// Die Ersteinrichtung (Bestand als bekannt verbuchen, ohne rückwirkend zu fluten)
// bleibt bewusst beim jeweiligen Aufrufer – fehlt die Status-Datei, gibt diese
// Funktion daher false zurück.
async function beanspruche(statusDatei, dateiname, nachricht) {
  for (let versuch = 0; versuch < MAX_VERSUCHE; versuch++) {
    const status = await ladeGesendet(statusDatei);
    if (!status.vorhanden) return false;
    if (status.gesendet.includes(dateiname)) return false;
    try {
      await schreibeGesendet(
        statusDatei,
        status.gesendet.concat(dateiname),
        status.sha,
        nachricht
      );
      return true;
    } catch (e) {
      if (istKonflikt(e)) continue; // paralleler Schreibzugriff -> neu lesen, erneut versuchen
      throw e;
    }
  }
  // Nach mehreren Konflikten kein sicherer Zuschlag: im Zweifel NICHT senden.
  // Der Doppel-Schutz hat Vorrang; der nächste Lauf holt es im Meldefenster nach.
  return false;
}

// Nimmt einen zuvor gesetzten Anspruch wieder zurück – z. B. wenn der Versand
// fehlschlug. So versucht es der nächste Lauf erneut und keine Zustellung fällt
// dauerhaft aus. Ist der Eintrag schon weg, passiert nichts.
async function gibFrei(statusDatei, dateiname, nachricht) {
  for (let versuch = 0; versuch < MAX_VERSUCHE; versuch++) {
    const status = await ladeGesendet(statusDatei);
    if (!status.vorhanden || !status.gesendet.includes(dateiname)) return;
    try {
      await schreibeGesendet(
        statusDatei,
        status.gesendet.filter((n) => n !== dateiname),
        status.sha,
        nachricht
      );
      return;
    } catch (e) {
      if (istKonflikt(e)) continue;
      throw e;
    }
  }
}

module.exports = { beanspruche, gibFrei, istKonflikt };
