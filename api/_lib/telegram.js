// Sendet Nachrichten an einen Telegram-Chat/-Kanal über die Telegram-Bot-API.
// Benötigt zwei Umgebungsvariablen (in Vercel eintragen):
//   TELEGRAM_BOT_TOKEN  – Token des Bots (von @BotFather)
//   TELEGRAM_CHAT_ID    – Ziel: Kanal-Name (z. B. "@morgenandachten") oder Chat-ID
// Fehlt eine der beiden, ist die Telegram-Meldung einfach ausgeschaltet.

// Ist die Telegram-Anbindung konfiguriert?
function telegramAktiv() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

// Eine Textnachricht senden. Löst bei einem Fehler eine Exception aus,
// damit der Aufrufer den fehlgeschlagenen Versand NICHT als "gesendet" merkt.
async function sendeTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      // Linkvorschau (Bild/Titel der Andacht) zulassen.
      disable_web_page_preview: false,
    }),
  });
  if (!res.ok) {
    const fehler = await res.text();
    throw new Error(`Telegram-Versand fehlgeschlagen (${res.status}): ${fehler}`);
  }
  return res.json();
}

module.exports = { telegramAktiv, sendeTelegram };
