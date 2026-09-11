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
// Die eigentliche Melde-Logik (Merker, Fälligkeit, Nachricht) liegt gemeinsam mit
// dem Veröffentlichen-Pfad (api/andachten.js) in api/_lib/melden.js – so wird jede
// Andacht genau einmal gemeldet, egal über welchen Weg sie fällig wird.

const { telegramAktiv } = require("./_lib/telegram");
const {
  VEROEFFENTLICHUNGS_STUNDE,
  heuteBerlin,
  stundeBerlin,
  meldeFaelligeAndachten,
} = require("./_lib/melden");

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
      ergebnis.telegram = await meldeFaelligeAndachten();
    }

    res.status(200).json({ ok: true, datum: heuteBerlin(), ...ergebnis });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || "Unbekannter Fehler.", ...ergebnis });
  }
};
