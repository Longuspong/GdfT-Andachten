// Bau-Zeit-Schalter: Welche optionalen Funktionen sind eingerichtet?
//
// Vercel stellt die Umgebungsvariablen auch beim Bauen bereit. So kann die Seite
// z. B. das E-Mail-Anmeldeformular nur dann anzeigen, wenn der Newsletter (Brevo)
// tatsächlich konfiguriert ist. Nach dem Eintragen der Variablen muss die Seite
// einmal neu gebaut/deployt werden, damit das Formular erscheint.
module.exports = {
  newsletter: Boolean(
    process.env.BREVO_API_KEY &&
      process.env.BREVO_LIST_ID &&
      process.env.BREVO_SENDER_EMAIL
  ),
};
