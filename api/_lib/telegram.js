// Sendet Nachrichten an einen Telegram-Chat/-Kanal über die Telegram-Bot-API.
// Benötigt zwei Umgebungsvariablen (in Vercel eintragen):
//   TELEGRAM_BOT_TOKEN  – Token des Bots (von @BotFather)
//   TELEGRAM_CHAT_ID    – Ziel: Kanal-Name (z. B. "@morgenandachten") oder Chat-ID
// Fehlt eine der beiden, ist die Telegram-Meldung einfach ausgeschaltet.

// Ist die Telegram-Anbindung konfiguriert?
function telegramAktiv() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

// Eine Textnachricht senden. Der Text wird als HTML interpretiert (parse_mode
// "HTML"), damit ein fetter Titel und ein verlinktes „mehr lesen..." möglich sind.
// Löst bei einem Fehler eine Exception aus, damit der Aufrufer den
// fehlgeschlagenen Versand NICHT als "gesendet" merkt.
//
//   vorschau  ob Telegram unter der Nachricht die Link-Vorschaukarte (Bild,
//             Titel usw. aus den OG-Tags der Seite) bauen darf. Sinnvoll nur,
//             wenn die verlinkte Seite beim Versand schon online ist – sonst
//             käme ohnehin keine Karte zustande.
async function sendeTelegram(text, { vorschau = true } = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      // Fetter Titel und blau verlinktes „mehr lesen..." kommen über HTML-Auszeichnung.
      parse_mode: "HTML",
      // Link-Vorschau (Bild/Titel der Andacht) nur zulassen, wenn die Seite
      // online ist.
      disable_web_page_preview: !vorschau,
    }),
  });
  if (!res.ok) {
    const fehler = await res.text();
    throw new Error(`Telegram-Versand fehlgeschlagen (${res.status}): ${fehler}`);
  }
  return res.json();
}

// Eine Andacht melden. Die Nachricht sieht immer gleich aus (siehe baueNachricht
// in melden.js): fetter Titel, darunter der Kurztext und ein blau verlinktes
// „mehr lesen...". Ist die Seite beim Versand schon online (seiteOnline = true),
// baut Telegram darunter zusätzlich die Link-Vorschaukarte mit Bild aus den
// OG-Tags der Seite (der „schöne" Look). Ist sie es noch nicht, wird die Vorschau
// unterdrückt (es käme ohnehin keine Karte zustande) – die Nachricht selbst kommt
// mit Titel, Kurztext und Link trotzdem vollständig an, nie nur ein nackter Link.
async function sendeTelegramAndacht({ nachricht, seiteOnline }) {
  return sendeTelegram(nachricht, { vorschau: Boolean(seiteOnline) });
}

module.exports = {
  telegramAktiv,
  sendeTelegram,
  sendeTelegramAndacht,
};
