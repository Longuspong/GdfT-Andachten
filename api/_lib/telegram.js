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

// Ein Foto mit Bildunterschrift senden. Telegram lädt das Bild von der
// angegebenen URL selbst herunter und zeigt es ZUVERLÄSSIG an – unabhängig davon,
// ob die (frisch gebaute) Andachtsseite schon online ist und ob Telegram eine
// Link-Vorschau erzeugen könnte. Löst bei einem Fehler eine Exception aus.
async function sendeTelegramFoto(fotoUrl, bildunterschrift) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      photo: fotoUrl,
      // Titel + Link. Telegram verlinkt die URL in der Bildunterschrift
      // automatisch (klickbar), erzeugt aber KEINE zweite Vorschaukarte.
      caption: bildunterschrift,
    }),
  });
  if (!res.ok) {
    const fehler = await res.text();
    throw new Error(`Telegram-Foto-Versand fehlgeschlagen (${res.status}): ${fehler}`);
  }
  return res.json();
}

// Eine Andacht melden – bevorzugt als Foto (Bild oben, Titel + Link darunter),
// damit das Vorschaubild sicher erscheint. Fehlt eine Bild-URL oder schlägt der
// Foto-Versand fehl (z. B. Bild für Telegram nicht abrufbar), wird als Rückfall
// die einfache Textnachricht mit Link-Vorschau gesendet. So kommt immer eine
// Meldung an – bevorzugt mit, notfalls ohne garantiertes Bild.
async function sendeTelegramAndacht({ text, bildUrl }) {
  if (bildUrl) {
    try {
      return await sendeTelegramFoto(bildUrl, text);
    } catch {
      // Foto-Versand nicht möglich -> unten auf Textnachricht zurückfallen.
    }
  }
  return sendeTelegram(text);
}

module.exports = {
  telegramAktiv,
  sendeTelegram,
  sendeTelegramFoto,
  sendeTelegramAndacht,
};
