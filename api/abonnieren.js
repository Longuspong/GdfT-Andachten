// Newsletter-Anmeldung (Double-Opt-In, Schritt 1).
//
// Nimmt eine E-Mail-Adresse entgegen und schickt eine Bestätigungsmail mit einem
// signierten Link. Erst der Klick darauf (api/newsletter-bestaetigen.js) trägt die
// Adresse in die Sende-Liste ein. Ohne Bestätigung wird nichts gespeichert –
// die Anmeldung ist bis dahin zustandslos (nur der signierte Token).
//
// Antwortet als JSON (wenn per JavaScript aufgerufen) oder als gestaltete
// HTML-Seite (wenn das Formular ohne JavaScript abgeschickt wurde).

const SITE = require("../src/_data/site.js");
const {
  newsletterAktiv,
  istGueltigeEmail,
  normalisiereEmail,
  bestaetigungsUrl,
  abmeldeUrl,
  istBestaetigt,
  sendeMail,
} = require("./_lib/brevo");
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

// Bestätigungsmail (Double-Opt-In).
function baueBestaetigungsMail(email) {
  const name = SITE.name || "Andachten";
  const url = bestaetigungsUrl(email);
  const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f1e7;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;font-family:Arial,Helvetica,sans-serif;color:#29303a;">
    <div style="background:#fffdf8;border:1px solid #e6ddca;border-top:4px solid #c39a45;border-radius:12px;padding:22px;">
      <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1f3550;">Fast geschafft!</h1>
      <p style="margin:0 0 1rem;font-size:16px;line-height:1.65;">Bitte bestätige, dass du die täglichen Andachten von ${escapeHTML(
        name
      )} per E-Mail erhalten möchtest.</p>
      <p style="margin:1.2rem 0;">
        <a href="${escapeHTML(url)}" style="display:inline-block;background:#1f3550;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:9px;font-weight:bold;font-size:16px;">Abo bestätigen</a>
      </p>
      <p style="margin:1rem 0 0;font-size:13px;line-height:1.6;color:#6a6f78;">Wenn du das nicht warst, ignoriere diese Mail einfach – ohne Bestätigung wird nichts gespeichert und du bekommst keine weiteren Nachrichten.</p>
    </div>
  </div>
</body></html>`;
  const text =
    `Fast geschafft!\n\nBitte bestätige dein Abo der Andachten von ${name}:\n${url}\n\n` +
    `Wenn du das nicht warst, ignoriere diese Mail einfach – ohne Bestätigung wird nichts gespeichert.\n`;
  return { betreff: `Bitte bestätige dein Abo – ${name}`, html, text };
}

// Hinweis-Mail, wenn die Adresse bereits angemeldet ist.
function baueSchonAngemeldetMail(email) {
  const name = SITE.name || "Andachten";
  const ab = abmeldeUrl(email);
  const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f6f1e7;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;font-family:Arial,Helvetica,sans-serif;color:#29303a;">
    <div style="background:#fffdf8;border:1px solid #e6ddca;border-top:4px solid #c39a45;border-radius:12px;padding:22px;">
      <p style="margin:0 0 1rem;font-size:16px;line-height:1.65;">Du bekommst die Andachten von ${escapeHTML(
        name
      )} bereits per E-Mail – du musst nichts weiter tun.</p>
      <p style="margin:0;font-size:13px;color:#6a6f78;"><a href="${escapeHTML(
        ab
      )}" style="color:#6a6f78;">Vom Newsletter abmelden</a></p>
    </div>
  </div>
</body></html>`;
  const text = `Du bekommst die Andachten von ${name} bereits per E-Mail.\n\nAbmelden: ${ab}\n`;
  return { betreff: `Du bist bereits angemeldet – ${name}`, html, text };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Methode nicht erlaubt." });
    return;
  }

  if (!newsletterAktiv()) {
    antwort(req, res, {
      statusCode: 503,
      json: { error: "Das E-Mail-Abo ist gerade nicht verfügbar." },
      htmlSeite: {
        titel: "E-Mail-Abo",
        ueberschrift: "Noch nicht verfügbar",
        absaetze: ["Das E-Mail-Abo ist noch nicht eingerichtet. Bitte versuche es später erneut."],
        ton: "fehler",
      },
    });
    return;
  }

  const body = leseBody(req);
  const email = normalisiereEmail(body.email);

  if (!istGueltigeEmail(email)) {
    antwort(req, res, {
      statusCode: 400,
      json: { error: "Bitte gib eine gültige E-Mail-Adresse ein." },
      htmlSeite: {
        titel: "E-Mail-Abo",
        ueberschrift: "Ungültige Adresse",
        absaetze: ["Diese E-Mail-Adresse sieht nicht gültig aus. Bitte prüfe sie und versuche es erneut."],
        ton: "fehler",
      },
    });
    return;
  }

  try {
    // Schon bestätigt? Dann nur ein kurzer Hinweis, keine neue Bestätigung.
    let schon = false;
    try {
      schon = await istBestaetigt(email);
    } catch {
      schon = false; // Prüfung fehlgeschlagen -> normal fortfahren
    }

    const mail = schon ? baueSchonAngemeldetMail(email) : baueBestaetigungsMail(email);
    await sendeMail({ an: email, betreff: mail.betreff, html: mail.html, text: mail.text });

    // Bewusst dieselbe Antwort, egal ob neu oder schon dabei (kein Verraten, wer
    // registriert ist).
    antwort(req, res, {
      statusCode: 200,
      json: {
        ok: true,
        meldung: "Fast geschafft! Wir haben dir eine Bestätigungsmail geschickt – bitte den Link darin anklicken.",
      },
      htmlSeite: {
        titel: "Bestätigung nötig",
        ueberschrift: "Fast geschafft!",
        absaetze: [
          `Wir haben eine Bestätigungsmail an ${email} geschickt.`,
          "Bitte öffne dein Postfach und klicke auf den Link darin, um dein Abo abzuschließen. (Schau ggf. auch im Spam-Ordner nach.)",
        ],
        ton: "erfolg",
      },
    });
  } catch (e) {
    antwort(req, res, {
      statusCode: 502,
      json: { error: "Die Bestätigungsmail konnte gerade nicht versendet werden. Bitte später erneut versuchen." },
      htmlSeite: {
        titel: "E-Mail-Abo",
        ueberschrift: "Etwas ist schiefgelaufen",
        absaetze: ["Die Bestätigungsmail konnte gerade nicht versendet werden. Bitte versuche es in ein paar Minuten erneut."],
        ton: "fehler",
      },
    });
  }
};
