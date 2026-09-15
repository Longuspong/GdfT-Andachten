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

// Eine Andacht melden. Der gewünschte Look ist die Textnachricht mit
// Link-VORSCHAUKARTE: Telegram holt sich Kanalname, Titel, KURZTEXT und Bild aus
// den OG-Tags der Andachtsseite. Das klappt aber nur, wenn die Seite beim Versand
// bereits ONLINE ist – sonst käme nur ein nackter Link an.
//
// Deshalb entscheidet der Aufrufer über `seiteOnline`:
//   seiteOnline = true  -> Textnachricht mit Vorschaukarte senden (der schöne
//                          Look mit Titel, Kurztext und Bild aus der Seite).
//   seiteOnline = false -> Die Seite ist (noch) nicht erreichbar, eine
//                          Vorschaukarte würde also FEHLEN. Als Rückfall das Bild
//                          direkt als Foto mitsenden und den KURZTEXT in die
//                          Bildunterschrift schreiben. So kommen Bild + Kurztext
//                          garantiert an – nie nur ein nackter Link.
//
//   textNachricht  kurze Textnachricht (Titel + Link) für die Vorschaukarte
//   fotoCaption    ausführliche Bildunterschrift (Titel + Kurztext + Link) für den Foto-Rückfall
//   bildUrl        absolute Bild-Adresse für den Foto-Rückfall (z. B. og-Bild)
async function sendeTelegramAndacht({ textNachricht, fotoCaption, bildUrl, seiteOnline }) {
  if (seiteOnline) {
    // Seite ist online -> Telegram baut die Vorschaukarte selbst aus der Seite.
    return sendeTelegram(textNachricht);
  }
  // Seite (noch) nicht erreichbar -> Bild direkt mitsenden, Kurztext in die
  // Bildunterschrift. Fehlt eine Bild-URL oder klappt der Foto-Versand nicht,
  // bleibt als letzter Ausweg die einfache Textnachricht.
  if (bildUrl) {
    try {
      return await sendeTelegramFoto(bildUrl, fotoCaption);
    } catch {
      // Foto-Versand nicht möglich -> unten auf Textnachricht zurückfallen.
    }
  }
  return sendeTelegram(fotoCaption || textNachricht);
}

module.exports = {
  telegramAktiv,
  sendeTelegram,
  sendeTelegramFoto,
  sendeTelegramAndacht,
};
