// Diagnose-Endpunkt für die Newsletter-/Brevo-Anbindung (nur für angemeldete
// Admins). Prüft die Konfiguration, den API-Schlüssel und schickt eine
// Testmail an die eigene Absender-Adresse. Meldet im Klartext, woran es hängt.

const { isAuthenticated } = require("./_lib/auth");
const { newsletterAktiv, absender, kontoInfo, sendeMail } = require("./_lib/brevo");

module.exports = async (req, res) => {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: "Nicht angemeldet." });
    return;
  }

  // 1. Konfiguration vollständig?
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

  // 2. API-Schlüssel gültig?
  let konto = null;
  try {
    konto = await kontoInfo();
  } catch (e) {
    res.status(200).json({
      ok: false,
      schritt: "verbindung",
      meldung: "Brevo ist nicht erreichbar: " + (e.message || "Unbekannter Fehler."),
    });
    return;
  }
  if (!konto.ok) {
    res.status(200).json({
      ok: false,
      schritt: "api-schluessel",
      meldung:
        "Der Brevo-API-Schlüssel wird abgelehnt (HTTP " +
        konto.status +
        "). Bitte BREVO_API_KEY in Vercel prüfen.",
    });
    return;
  }

  // 3. Testmail an die eigene Absender-Adresse.
  const zeit = new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  }).format(new Date());
  const ziel = absender().email;
  try {
    await sendeMail({
      an: ziel,
      betreff: "✅ Newsletter-Test – Gerüstet für den Tag",
      html: `<p>Testmail (${zeit}). Wenn du das siehst, funktioniert der Newsletter-Versand über Brevo.</p>`,
      text: `Testmail (${zeit}). Wenn du das siehst, funktioniert der Newsletter-Versand über Brevo.`,
    });
    res.status(200).json({
      ok: true,
      schritt: "gesendet",
      meldung:
        "Testmail an " +
        ziel +
        " gesendet – bitte im Postfach (ggf. Spam-Ordner) nachsehen. Kommt sie an, ist alles bereit.",
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
