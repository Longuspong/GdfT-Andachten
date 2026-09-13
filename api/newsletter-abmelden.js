// Newsletter-Abmeldung.
//
// Jeder versendete Andachts-Newsletter enthält einen persönlichen Abmeldelink mit
// signiertem Token. Ein Klick (GET) entfernt die Adresse aus der Brevo-Liste und
// zeigt eine Bestätigungsseite. Zusätzlich wird POST unterstützt, damit die
// Ein-Klick-Abmeldung mancher E-Mail-Programme (List-Unsubscribe, RFC 8058)
// funktioniert.

const SITE = require("../src/_data/site.js");
const { newsletterAktiv, pruefeToken, kontaktLoeschen } = require("./_lib/brevo");
const { seiteHtml } = require("./_lib/seite");

function sende(res, statusCode, seite) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(statusCode).send(seiteHtml(seite));
}

module.exports = async (req, res) => {
  const name = SITE.name || "die Andachten";
  const einKlick = req.method === "POST"; // List-Unsubscribe-Post (kein HTML nötig)

  if (!newsletterAktiv()) {
    if (einKlick) {
      res.status(503).end();
      return;
    }
    sende(res, 503, {
      titel: "Abmeldung",
      ueberschrift: "Gerade nicht möglich",
      absaetze: ["Die Abmeldung ist gerade nicht möglich. Bitte versuche es später erneut."],
      ton: "fehler",
    });
    return;
  }

  const token = req.query && req.query.token;
  const email = pruefeToken(token, "unsub");

  if (!email) {
    if (einKlick) {
      res.status(400).end();
      return;
    }
    sende(res, 400, {
      titel: "Abmeldung",
      ueberschrift: "Link ungültig",
      absaetze: [
        "Dieser Abmeldelink ist ungültig. Bitte benutze den Link aus einer aktuellen Andachts-E-Mail.",
      ],
      ton: "fehler",
    });
    return;
  }

  try {
    await kontaktLoeschen(email);
    if (einKlick) {
      res.status(200).end();
      return;
    }
    sende(res, 200, {
      titel: "Abgemeldet",
      ueberschrift: "Du bist abgemeldet",
      absaetze: [
        `Du bekommst ab jetzt keine E-Mails mehr von ${name}. Schade, dass du gehst!`,
        "Wenn du magst, kannst du dich jederzeit wieder auf der Startseite anmelden.",
      ],
      aktionText: "Zur Startseite",
      aktionUrl: String(SITE.url || "/"),
      ton: "erfolg",
    });
  } catch (e) {
    if (einKlick) {
      res.status(502).end();
      return;
    }
    sende(res, 502, {
      titel: "Abmeldung",
      ueberschrift: "Etwas ist schiefgelaufen",
      absaetze: ["Die Abmeldung konnte gerade nicht abgeschlossen werden. Bitte versuche es in ein paar Minuten erneut."],
      ton: "fehler",
    });
  }
};
