// Manueller Telegram-Versand für EINE bereits veröffentlichte Andacht.
//
// Hintergrund: Der automatische Versand beim Veröffentlichen ist "best effort".
// Ging eine Meldung einmal nicht raus, kann sie hier – für genau diese Andacht –
// von Hand angestoßen werden. Der Versand geschieht NUR, wenn die Andacht
// tatsächlich schon online ist (fällig UND öffentlich erreichbar); sonst gibt es
// eine klare Fehlermeldung. Die eigentliche Logik liegt in api/_lib/melden.js.

const { isAuthenticated } = require("./_lib/auth");
const { telegramAktiv } = require("./_lib/telegram");
const { meldeManuell } = require("./_lib/melden");

module.exports = async (req, res) => {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: "Nicht angemeldet." });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Methode nicht erlaubt." });
    return;
  }

  if (!telegramAktiv()) {
    res.status(409).json({
      error:
        "Telegram ist nicht eingerichtet (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID fehlen).",
    });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const datei = body && body.datei;
    if (!datei) {
      res.status(400).json({ error: "Es fehlt die Angabe, welche Andacht gemeldet werden soll." });
      return;
    }

    const ergebnis = await meldeManuell({ datei });
    res.status(200).json({
      ok: true,
      meldung: "Die Andacht wurde per Telegram gemeldet.",
      ...ergebnis,
    });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || "Unbekannter Fehler." });
  }
};
