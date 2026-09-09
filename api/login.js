const crypto = require("crypto");
const { createSessionCookie } = require("./_lib/auth");

// Zeitkonstanter Vergleich, damit über die Antwortzeit nichts über das
// Passwort verraten wird (die Länge wird über den SHA-256-Hash verdeckt).
function passwortStimmt(eingabe, erwartet) {
  const a = crypto.createHash("sha256").update(String(eingabe)).digest();
  const b = crypto.createHash("sha256").update(String(erwartet)).digest();
  return crypto.timingSafeEqual(a, b);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Methode nicht erlaubt." });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const { passwort } = body;
    const erwartet = process.env.ADMIN_PASSWORD;

    if (!erwartet) {
      res.status(500).json({ error: "ADMIN_PASSWORD ist auf dem Server nicht gesetzt." });
      return;
    }

    const eingabe = typeof passwort === "string" ? passwort : "";

    if (!passwortStimmt(eingabe, erwartet)) {
      // Kleine Verzögerung erschwert automatisiertes Durchprobieren.
      await new Promise((r) => setTimeout(r, 400));
      res.status(401).json({ error: "Falsches Passwort." });
      return;
    }

    res.setHeader("Set-Cookie", createSessionCookie());
    res.status(200).json({ ok: true });
  } catch {
    res.status(400).json({ error: "Ungültige Anfrage." });
  }
};
