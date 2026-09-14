// Admin-Test: schickt die ECHTE, fertig formatierte Newsletter-Mail einer
// bereits fälligen Andacht (standardmäßig der heutigen) an die eigene
// Absender-Adresse – als aussagekräftiger Test, wie die Mail beim Abonnenten
// wirklich aussieht.
//
// WICHTIG: Dies ist ein TEST. Es wird
//   - nur an die eigene (verifizierte) Absender-Adresse gesendet, NICHT an die
//     Abonnentenliste, und
//   - der "schon gemailt"-Merker (newsletter-gesendet.json) NICHT verändert.
// Der reguläre Versand an die Abonnenten (täglicher Lauf / Veröffentlichen)
// bleibt davon völlig unberührt.

const { isAuthenticated } = require("./_lib/auth");
const { getFile } = require("./_lib/github");
const { newsletterAktiv, absender, abmeldeUrl, sendeMail } = require("./_lib/brevo");
const { baueAndachtMail } = require("./_lib/mailen");
const {
  heuteBerlin,
  stundeBerlin,
  istFaelligJetzt,
  andachtUrl,
  listeAndachten,
  frontMatterFelder,
} = require("./_lib/melden");

const ORDNER = "src/andachten";

function sichererDateiname(name) {
  return String(name || "").replace(/[^a-zA-Z0-9._-]/g, "");
}

// Die aktuell "heutige" Andacht bestimmen: die neueste bereits fällige (Datum
// erreicht, an ihrem Tag ab 6 Uhr), kein Entwurf.
async function findeHeutigeAndacht() {
  const heute = heuteBerlin();
  const stunde = stundeBerlin();
  const alle = (await listeAndachten())
    .filter((a) => istFaelligJetzt(a.datum, heute, stunde))
    .sort((a, b) => (a.datum < b.datum ? 1 : a.datum > b.datum ? -1 : 0));
  for (const a of alle) {
    const file = await getFile(`${ORDNER}/${a.datei}`);
    if (!file) continue;
    const felder = frontMatterFelder(file.content);
    if (felder.entwurf === true) continue;
    return { ...a, felder };
  }
  return null;
}

// Eine bestimmte Andacht (per Dateiname) laden.
async function ladeAndacht(datei) {
  const safe = sichererDateiname(datei);
  const m = safe.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.md$/);
  if (!m) return null;
  const file = await getFile(`${ORDNER}/${safe}`);
  if (!file) return null;
  return { datei: safe, datum: m[1], slug: m[2], felder: frontMatterFelder(file.content) };
}

module.exports = async (req, res) => {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: "Nicht angemeldet." });
    return;
  }

  // Konfiguration vollständig? (gleiche klare Meldung wie in newsletter-test.js)
  if (!newsletterAktiv()) {
    const fehlend = [
      !process.env.BREVO_API_KEY && "BREVO_API_KEY",
      !process.env.BREVO_LIST_ID && "BREVO_LIST_ID",
      !process.env.BREVO_SENDER_EMAIL && "BREVO_SENDER_EMAIL",
    ].filter(Boolean);
    res.status(200).json({
      ok: false,
      schritt: "konfiguration",
      meldung:
        "Der Newsletter ist noch nicht vollständig eingerichtet. Es fehlt: " +
        fehlend.join(", ") +
        ". Bitte in Vercel unter Settings → Environment Variables (für „Production“) eintragen und neu deployen.",
    });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const gewuenscht = body && body.datei;
    const andacht = gewuenscht ? await ladeAndacht(gewuenscht) : await findeHeutigeAndacht();

    if (!andacht) {
      res.status(200).json({
        ok: false,
        schritt: "andacht",
        meldung: gewuenscht
          ? "Die angegebene Andacht wurde nicht gefunden."
          : "Es gibt aktuell keine fällige (heute sichtbare) Andacht, die getestet werden könnte.",
      });
      return;
    }
    if (andacht.felder && andacht.felder.entwurf === true) {
      res.status(200).json({
        ok: false,
        schritt: "andacht",
        meldung: "Das ist noch ein Entwurf – bitte zuerst veröffentlichen.",
      });
      return;
    }

    const ziel = absender().email;
    const { betreff, html, text } = baueAndachtMail({
      datum: andacht.datum,
      slug: andacht.slug,
      felder: andacht.felder,
      abmelde: abmeldeUrl(ziel),
    });

    // Betreff kennzeichnen, damit die Testmail im Postfach nicht mit einer
    // echten Zustellung verwechselt wird.
    await sendeMail({
      an: ziel,
      betreff: `[TEST] ${betreff}`,
      html,
      text,
      listUnsubscribe: abmeldeUrl(ziel),
    });

    const titel = (andacht.felder && andacht.felder.titel) || andacht.slug;
    res.status(200).json({
      ok: true,
      schritt: "gesendet",
      datei: andacht.datei,
      url: andachtUrl(andacht.datum, andacht.slug),
      meldung:
        `Test-Newsletter „${titel}“ (${andacht.datum}) an ${ziel} gesendet – bitte im Postfach ` +
        "(ggf. Spam-Ordner) nachsehen. Der Versand an die Abonnenten wurde dadurch NICHT ausgelöst.",
    });
  } catch (e) {
    let hinweis = e.message || "Versand fehlgeschlagen.";
    if (/sender/i.test(hinweis) && /not|valid|verif/i.test(hinweis)) {
      hinweis =
        "Die Absender-Adresse (BREVO_SENDER_EMAIL) ist bei Brevo noch nicht verifiziert. Bitte in Brevo unter „Senders, Domains & Dedicated IPs“ den Absender bestätigen.";
    }
    res.status(200).json({ ok: false, schritt: "senden", meldung: hinweis, rohfehler: e.message });
  }
};
