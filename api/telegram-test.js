// Diagnose-Endpunkt für die Telegram-Anbindung (nur für angemeldete Admins).
//
// Sendet eine Testnachricht in den konfigurierten Kanal und meldet KLARTEXT
// zurück, woran es hängt, wenn nichts ankommt: fehlende Konfiguration, ein
// ungültiger Bot-Token, oder ein Kanal-/Rechte-Problem. So wird der sonst
// stille Fehlschlag des automatischen Versands sichtbar.

const { isAuthenticated } = require("./_lib/auth");
const { telegramAktiv, sendeTelegram } = require("./_lib/telegram");

// Einen GET-Aufruf gegen die Telegram-Bot-API machen (z. B. "getMe").
async function telegramGet(methode) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const res = await fetch(`https://api.telegram.org/bot${token}/${methode}`);
  let daten = null;
  try {
    daten = await res.json();
  } catch {
    /* keine/keine JSON-Antwort */
  }
  return { httpOk: res.ok, status: res.status, daten };
}

// Häufige Telegram-Fehlermeldungen in einen verständlichen Hinweis übersetzen.
function deuteFehler(rohfehler) {
  const text = String(rohfehler || "").toLowerCase();
  if (text.includes("chat not found")) {
    return "Der Kanal wurde nicht gefunden. Bitte TELEGRAM_CHAT_ID prüfen (z. B. „@morgenandachten\") und sicherstellen, dass der Bot dem Kanal hinzugefügt wurde.";
  }
  if (text.includes("not enough rights") || text.includes("need administrator")) {
    return "Der Bot ist im Kanal, darf aber nicht posten. Bitte ihm im Kanal das Administrator-Recht „Nachrichten senden/posten\" geben.";
  }
  if (text.includes("bot is not a member") || text.includes("bot was kicked") || text.includes("forbidden")) {
    return "Der Bot ist kein (aktives) Mitglied des Kanals. Bitte den Bot als Administrator zum Kanal hinzufügen.";
  }
  if (text.includes("unauthorized")) {
    return "Der Bot-Token wird abgelehnt. Bitte TELEGRAM_BOT_TOKEN prüfen.";
  }
  return "Telegram hat den Versand abgelehnt: " + rohfehler;
}

module.exports = async (req, res) => {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: "Nicht angemeldet." });
    return;
  }

  const tokenGesetzt = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  const chatGesetzt = Boolean(process.env.TELEGRAM_CHAT_ID);

  // 1. Konfiguration vorhanden?
  if (!telegramAktiv()) {
    const fehlend = [
      !tokenGesetzt && "TELEGRAM_BOT_TOKEN",
      !chatGesetzt && "TELEGRAM_CHAT_ID",
    ].filter(Boolean);
    res.status(200).json({
      ok: false,
      schritt: "konfiguration",
      meldung:
        "Telegram ist nicht vollständig eingerichtet. Es fehlt: " +
        fehlend.join(" und ") +
        ". Bitte in Vercel unter Settings → Environment Variables (für „Production\") eintragen und die Seite neu deployen.",
    });
    return;
  }

  // 2. Bot-Token gültig? (getMe verrät auch den Bot-Namen.)
  let botName = "";
  try {
    const me = await telegramGet("getMe");
    if (!(me.daten && me.daten.ok)) {
      res.status(200).json({
        ok: false,
        schritt: "bot-token",
        meldung:
          "Der Bot-Token wird von Telegram abgelehnt (HTTP " +
          me.status +
          "). Bitte TELEGRAM_BOT_TOKEN in Vercel prüfen.",
      });
      return;
    }
    botName = me.daten.result && me.daten.result.username ? "@" + me.daten.result.username : "";
  } catch (e) {
    res.status(200).json({
      ok: false,
      schritt: "verbindung",
      meldung: "Telegram ist nicht erreichbar: " + (e.message || "Unbekannter Fehler."),
    });
    return;
  }

  // 3. Testnachricht in den Kanal senden.
  const zeit = new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  }).format(new Date());
  try {
    await sendeTelegram(
      "✅ Testnachricht von „Gerüstet für den Tag\" (" +
        zeit +
        "). Wenn du das im Kanal siehst, funktioniert die Telegram-Anbindung."
    );
    res.status(200).json({
      ok: true,
      schritt: "gesendet",
      bot: botName,
      meldung:
        "Testnachricht gesendet" +
        (botName ? " (Bot " + botName + ")" : "") +
        " – bitte im Telegram-Kanal nachsehen.",
    });
  } catch (e) {
    res.status(200).json({
      ok: false,
      schritt: "senden",
      bot: botName,
      meldung: deuteFehler(e.message),
      rohfehler: e.message,
    });
  }
};
