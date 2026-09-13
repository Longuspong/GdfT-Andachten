// Newsletter-Anmeldung (Double-Opt-In, Schritt 2): der Bestätigungslink.
//
// Prüft den signierten Token aus der Bestätigungsmail und trägt die Adresse dann
// in die Brevo-Sende-Liste ein. Antwortet immer als gestaltete HTML-Seite (der
// Link wird im Browser geöffnet).

const SITE = require("../src/_data/site.js");
const { newsletterAktiv, pruefeToken, kontaktBestaetigen } = require("./_lib/brevo");
const { seiteHtml } = require("./_lib/seite");

function sende(res, statusCode, seite) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(statusCode).send(seiteHtml(seite));
}

module.exports = async (req, res) => {
  const name = SITE.name || "die Andachten";

  if (!newsletterAktiv()) {
    sende(res, 503, {
      titel: "E-Mail-Abo",
      ueberschrift: "Noch nicht verfügbar",
      absaetze: ["Das E-Mail-Abo ist gerade nicht eingerichtet. Bitte versuche es später erneut."],
      ton: "fehler",
    });
    return;
  }

  const token = req.query && req.query.token;
  const email = pruefeToken(token, "confirm");

  if (!email) {
    sende(res, 400, {
      titel: "Bestätigung",
      ueberschrift: "Link ungültig oder abgelaufen",
      absaetze: [
        "Dieser Bestätigungslink ist ungültig oder schon abgelaufen (er gilt 7 Tage).",
        "Bitte melde dich einfach noch einmal auf der Startseite an – du bekommst dann eine neue Bestätigungsmail.",
      ],
      aktionText: "Zur Startseite",
      aktionUrl: String(SITE.url || "/"),
      ton: "fehler",
    });
    return;
  }

  try {
    await kontaktBestaetigen(email);
    sende(res, 200, {
      titel: "Anmeldung bestätigt",
      ueberschrift: "Anmeldung bestätigt – danke!",
      absaetze: [
        `Ab jetzt bekommst du jede neue Andacht von ${name} per E-Mail.`,
        "Du kannst dich jederzeit wieder abmelden – über den Link am Ende jeder E-Mail.",
      ],
      ton: "erfolg",
    });
  } catch (e) {
    sende(res, 502, {
      titel: "Bestätigung",
      ueberschrift: "Etwas ist schiefgelaufen",
      absaetze: [
        "Deine Bestätigung konnte gerade nicht gespeichert werden. Bitte versuche es in ein paar Minuten noch einmal über den Link in der Mail.",
      ],
      ton: "fehler",
    });
  }
};
