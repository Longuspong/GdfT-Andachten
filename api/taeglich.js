// Täglicher Lauf – wird morgens angestoßen (durch einen externen Cron-Dienst wie
// cron-job.org und/oder den GitHub-Actions-Workflow .github/workflows/taeglich.yml
// als Reserve; früher per Vercel-Cron).
//
// WICHTIG: Dieser Endpunkt muss gefahrlos MEHRFACH bzw. GLEICHZEITIG aufrufbar
// sein – Cron-/Aufruf-Systeme liefern in der Praxis oft „mindestens einmal", und
// hier ruft ihn ein Pinger bewusst mehrfach im Morgenfenster auf. Der Schutz gegen
// doppelte Telegram-/E-Mail-Zustellung steckt in api/_lib/merker.js (atomare
// Beanspruchung vor dem Senden); ein überflüssiger Neu-Bau wird durch neubauNoetig
// vermieden.
//
// Zwei Aufgaben, bewusst zeitlich getrennt (siehe SICHTBAR_AB_STUNDE/MELDE_STUNDE
// in api/_lib/melden.js):
//   1. Neu-Bau anstoßen (ab 4 Uhr): Vordatierte Andachten (Datum in der Zukunft)
//      werden beim Bauen ausgeblendet (siehe src/andachten/andachten.11tydata.js).
//      Damit eine solche Andacht an ihrem Tag von selbst erscheint, muss die Seite
//      an diesem Tag neu gebaut werden – über einen Vercel "Deploy Hook". Früh
//      genug, damit sie zuverlässig VOR 6 Uhr online ist.
//   2. Telegram-/E-Mail-Meldung (ab 6 Uhr): Neu fällige Andachten (Datum
//      erreicht/überschritten, noch nicht gemeldet) werden einmalig gepostet bzw.
//      gemailt – bewusst später als die Veröffentlichung, um nicht sehr früh zu
//      benachrichtigen.
//
// Die eigentliche Melde-Logik (Merker, Fälligkeit, Nachricht) liegt gemeinsam mit
// dem Veröffentlichen-Pfad (api/andachten.js) in api/_lib/melden.js – so wird jede
// Andacht genau einmal gemeldet, egal über welchen Weg sie fällig wird.

const { telegramAktiv } = require("./_lib/telegram");
const {
  SICHTBAR_AB_STUNDE,
  MELDE_STUNDE,
  heuteBerlin,
  stundeBerlin,
  neubauNoetig,
  meldeFaelligeAndachten,
} = require("./_lib/melden");
const { newsletterAktiv } = require("./_lib/brevo");
const { maileFaelligeAndachten } = require("./_lib/mailen");

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

  // Zwei getrennte Morgen-Phasen (deutscher Zeit), damit "bis 6 Uhr online" auch
  // mit ungenauen, kostenlosen Cron-Diensten zuverlässig klappt:
  //   ab SICHTBAR_AB_STUNDE (4 Uhr): VERÖFFENTLICHEN – Neu-Bau anstoßen, damit die
  //     vordatierte Andacht sicher VOR 6 Uhr online steht (Puffer für verspätete
  //     Läufe). Es wird nur gebaut, wenn wirklich etwas noch nicht online ist
  //     (neubauNoetig) – so darf der Endpunkt gefahrlos oft aufgerufen werden.
  //   ab MELDE_STUNDE (6 Uhr): zusätzlich MELDEN – Telegram + E-Mail-Newsletter.
  //     So bekommen Abonnenten keine sehr frühe Morgen-Nachricht.
  // Vor SICHTBAR_AB_STUNDE gibt es nichts zu tun. Mit ?force=1 (nur manuell,
  // geschützt durch CRON_SECRET) lassen sich beide Sperren zum Testen umgehen.
  const erzwingen = req.query && (req.query.force === "1" || req.query.force === "true");
  const stunde = stundeBerlin();
  if (!erzwingen && stunde < SICHTBAR_AB_STUNDE) {
    res.status(200).json({
      ok: true,
      uebersprungen: true,
      grund: `Vor ${SICHTBAR_AB_STUNDE} Uhr (deutscher Zeit) – nichts zu tun.`,
      stundeBerlin: stunde,
    });
    return;
  }

  const meldenErlaubt = erzwingen || stunde >= MELDE_STUNDE;

  const ergebnis = { neubau: null, telegram: null, newsletter: null };
  try {
    // 1. Neu-Bau anstoßen – aber nur, wenn eine fällige Andacht noch nicht online
    //    ist (spart überflüssige Deployments bei mehrfachem Aufruf im Morgenfenster).
    //    Fehler dürfen den Lauf nicht abbrechen.
    try {
      if (erzwingen || (await neubauNoetig())) {
        ergebnis.neubau = await stosseNeubauAn();
      } else {
        ergebnis.neubau = { uebersprungen: true, grund: "Alles Fällige ist bereits online." };
      }
    } catch (e) {
      ergebnis.neubau = { ok: false, fehler: e.message };
    }

    // 2. + 3. Meldungen erst ab der Melde-Stunde (6 Uhr). Zwischen Sichtbar- und
    //    Melde-Stunde (4–6 Uhr) wird nur veröffentlicht, noch nicht gemeldet.
    if (!meldenErlaubt) {
      const grund = `Vor ${MELDE_STUNDE} Uhr (deutscher Zeit) – nur veröffentlicht, noch keine Meldung.`;
      ergebnis.telegram = { uebersprungen: true, grund };
      ergebnis.newsletter = { uebersprungen: true, grund };
    } else {
      // 2. Telegram-Meldung (nur wenn konfiguriert).
      if (!telegramAktiv()) {
        ergebnis.telegram = { uebersprungen: true, grund: "Telegram nicht konfiguriert." };
      } else {
        ergebnis.telegram = await meldeFaelligeAndachten();
      }

      // 3. E-Mail-Newsletter (nur wenn konfiguriert). Fehler dürfen den Lauf nicht
      //    abbrechen – Telegram/Neu-Bau sind bereits erledigt.
      if (!newsletterAktiv()) {
        ergebnis.newsletter = { uebersprungen: true, grund: "Newsletter nicht konfiguriert." };
      } else {
        try {
          ergebnis.newsletter = await maileFaelligeAndachten();
        } catch (e) {
          ergebnis.newsletter = { ok: false, fehler: e.message };
        }
      }
    }

    res.status(200).json({ ok: true, datum: heuteBerlin(), stundeBerlin: stunde, meldenErlaubt, ...ergebnis });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || "Unbekannter Fehler.", ...ergebnis });
  }
};
