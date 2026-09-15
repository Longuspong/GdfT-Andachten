// Kontaktformular (/kontakt/). Nimmt Name, E-Mail und Nachricht entgegen und
// schickt sie per E-Mail an site.kontakt_email.
//
// Versand über den STRATO-Mailserver (SMTP) mit nodemailer – bewusst NICHT über
// Brevo: Brevo stellt an die eigene Domain-Adresse (ronny@…) nicht zu (Hard
// Bounce + Sperrliste), STRATO liefert an sein eigenes Postfach dagegen
// zuverlässig.
//
// Benötigte Umgebungsvariablen (in Vercel eintragen):
//   SMTP_USER  – Login des STRATO-Postfachs (die Postfach-Adresse)
//   SMTP_PASS  – Passwort dieses Postfachs
// Optional (mit sinnvollen Voreinstellungen):
//   SMTP_HOST  – Standard: smtp.strato.de
//   SMTP_PORT  – Standard: 465 (SSL)
//   SMTP_FROM  – Absender-Adresse; Standard: SMTP_USER
//
// Antwortet als JSON (per JavaScript aufgerufen) oder als gestaltete HTML-Seite
// (Formular ohne JavaScript abgeschickt).

const nodemailer = require("nodemailer");
const SITE = require("../src/_data/site.js");
const { seiteHtml, escapeHTML } = require("./_lib/seite");

function willJson(req) {
  return (
    /application\/json/i.test((req.headers && req.headers.accept) || "") ||
    Boolean(req.headers && req.headers["x-requested-with"])
  );
}

function leseBody(req) {
  const b = req.body;
  if (!b) return {};
  if (typeof b === "string") {
    try {
      return JSON.parse(b);
    } catch {
      const o = {};
      new URLSearchParams(b).forEach((v, k) => (o[k] = v));
      return o;
    }
  }
  return b;
}

function antwort(req, res, { statusCode, json, htmlSeite }) {
  if (willJson(req)) {
    res.status(statusCode).json(json);
  } else {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(statusCode).send(seiteHtml(htmlSeite));
  }
}

function istGueltigeEmail(email) {
  const e = String(email || "").trim();
  return e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function kontaktAktiv() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function transporter() {
  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.strato.de",
    port,
    secure: port === 465, // 465 = SSL, 587 = STARTTLS
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Methode nicht erlaubt." });
    return;
  }

  const body = leseBody(req);
  const name = String(body.name || "").trim().slice(0, 120);
  const email = String(body.email || "").trim().slice(0, 254);
  const nachricht = String(body.nachricht || "").trim().slice(0, 5000);
  const honigtopf = String(body.webseite || "").trim();

  // Spam-Bot: Honigtopf-Feld ausgefüllt -> so tun, als sei alles ok, aber nichts
  // senden.
  if (honigtopf) {
    antwort(req, res, {
      statusCode: 200,
      json: { ok: true, meldung: "Danke für deine Nachricht!" },
      htmlSeite: {
        titel: "Kontakt",
        ueberschrift: "Danke!",
        absaetze: ["Deine Nachricht ist bei uns eingegangen."],
        ton: "erfolg",
      },
    });
    return;
  }

  if (!name || !istGueltigeEmail(email) || nachricht.length < 2) {
    antwort(req, res, {
      statusCode: 400,
      json: { error: "Bitte Name, eine gültige E-Mail-Adresse und eine Nachricht angeben." },
      htmlSeite: {
        titel: "Kontakt",
        ueberschrift: "Bitte prüfen",
        absaetze: ["Bitte gib deinen Namen, eine gültige E-Mail-Adresse und eine Nachricht ein."],
        aktionText: "Zurück zum Formular",
        aktionUrl: "/kontakt/",
        ton: "fehler",
      },
    });
    return;
  }

  if (!kontaktAktiv()) {
    antwort(req, res, {
      statusCode: 503,
      json: { error: "Das Kontaktformular ist gerade nicht verfügbar." },
      htmlSeite: {
        titel: "Kontakt",
        ueberschrift: "Noch nicht verfügbar",
        absaetze: ["Das Kontaktformular ist noch nicht eingerichtet. Bitte versuche es später erneut."],
        ton: "fehler",
      },
    });
    return;
  }

  const empfaenger = SITE.kontakt_email;
  const von = process.env.SMTP_FROM || process.env.SMTP_USER;

  const textInhalt =
    `Neue Nachricht über das Kontaktformular von ${SITE.name}:\n\n` +
    `Name:    ${name}\n` +
    `E-Mail:  ${email}\n\n` +
    `Nachricht:\n${nachricht}\n`;

  const htmlInhalt =
    `<p>Neue Nachricht über das Kontaktformular von ${escapeHTML(SITE.name)}:</p>` +
    `<p><strong>Name:</strong> ${escapeHTML(name)}<br>` +
    `<strong>E-Mail:</strong> ${escapeHTML(email)}</p>` +
    `<p><strong>Nachricht:</strong></p>` +
    `<p style="white-space:pre-wrap">${escapeHTML(nachricht)}</p>`;

  try {
    await transporter().sendMail({
      from: `"Kontaktformular ${SITE.name}" <${von}>`,
      to: empfaenger,
      replyTo: `"${name}" <${email}>`,
      subject: `Kontaktformular: Nachricht von ${name}`,
      text: textInhalt,
      html: htmlInhalt,
    });

    antwort(req, res, {
      statusCode: 200,
      json: { ok: true, meldung: "Danke! Deine Nachricht wurde gesendet." },
      htmlSeite: {
        titel: "Kontakt",
        ueberschrift: "Danke für deine Nachricht!",
        absaetze: [
          "Wir haben deine Nachricht erhalten und melden uns, sobald wir können.",
        ],
        ton: "erfolg",
      },
    });
  } catch (e) {
    antwort(req, res, {
      statusCode: 502,
      json: { error: "Die Nachricht konnte gerade nicht versendet werden. Bitte später erneut versuchen." },
      htmlSeite: {
        titel: "Kontakt",
        ueberschrift: "Etwas ist schiefgelaufen",
        absaetze: [
          "Deine Nachricht konnte gerade nicht versendet werden. Bitte versuche es in ein paar Minuten erneut.",
        ],
        aktionText: "Zurück zum Formular",
        aktionUrl: "/kontakt/",
        ton: "fehler",
      },
    });
  }
};
