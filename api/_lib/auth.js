// Einfache, abhängigkeitsfreie Session-Verwaltung per signiertem Cookie.
// Kein Datenbank-Login nötig, da nur eine einzelne Person (mit einem im
// Vercel-Dashboard hinterlegten Passwort) Zugriff auf /admin/ hat.

const crypto = require("crypto");

const SESSION_COOKIE = "gdft_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 Stunden

function sign(value) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET ist nicht gesetzt (Vercel-Umgebungsvariable fehlt).");
  }
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

// Erzeugt den Set-Cookie-Header für eine frisch angemeldete Sitzung.
function createSessionCookie() {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `ok.${expires}`;
  const signature = sign(payload);
  const value = `${payload}.${signature}`;
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(value)}`,
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Path=/",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ].join("; ");
}

// Löscht das Session-Cookie (Abmelden).
function clearSessionCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    out[key] = decodeURIComponent(value);
  });
  return out;
}

// Prüft, ob die Anfrage ein gültiges, nicht abgelaufenes Session-Cookie trägt.
function isAuthenticated(req) {
  try {
    const cookies = parseCookies(req.headers.cookie || "");
    const value = cookies[SESSION_COOKIE];
    if (!value) return false;

    const lastDot = value.lastIndexOf(".");
    if (lastDot === -1) return false;
    const payload = value.slice(0, lastDot);
    const signature = value.slice(lastDot + 1);
    const expected = sign(payload);

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return false;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return false;

    const expires = Number(payload.split(".")[1]);
    if (!expires || Date.now() > expires) return false;

    return true;
  } catch {
    return false;
  }
}

module.exports = {
  createSessionCookie,
  clearSessionCookie,
  isAuthenticated,
};
