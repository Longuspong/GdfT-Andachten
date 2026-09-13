// Anbindung an Brevo (ehemals Sendinblue) – EU-Anbieter für E-Mail-Versand und
// Kontaktverwaltung. Free-Tier: 300 Mails/Tag, unbegrenzt Kontakte.
//
// Brevo übernimmt zwei Dinge:
//   1. Kontaktliste (die bestätigten Abonnenten) – privat, in der EU.
//   2. Versand der E-Mails (transaktional, eine Mail je Empfänger, damit jeder
//      seinen eigenen Abmeldelink bekommt).
//
// Das Anmelde-/Bestätigungs-/Abmelde-Verfahren (Double-Opt-In) bauen wir selbst
// drumherum – Brevo speichert nur die bestätigten Adressen.
//
// Benötigte Umgebungsvariablen (in Vercel eintragen):
//   BREVO_API_KEY       – API-Schlüssel (Brevo → SMTP & API → API Keys)
//   BREVO_LIST_ID       – ID der Kontaktliste (Zahl)
//   BREVO_SENDER_EMAIL  – verifizierte Absender-Adresse
//   BREVO_SENDER_NAME   – Anzeigename des Absenders (optional; sonst Seitenname)
// Zum Signieren der Bestätigungs-/Abmelde-Links:
//   NEWSLETTER_SECRET   – langer Zufallstext (optional; sonst SESSION_SECRET)
// Fehlt eine der ersten drei, ist der Newsletter einfach ausgeschaltet.

const crypto = require("crypto");
const SITE = require("../../src/_data/site.js");

const API = "https://api.brevo.com/v3";

// Ist der Newsletter vollständig konfiguriert?
function newsletterAktiv() {
  return Boolean(
    process.env.BREVO_API_KEY &&
      process.env.BREVO_LIST_ID &&
      process.env.BREVO_SENDER_EMAIL
  );
}

function listId() {
  return Number(process.env.BREVO_LIST_ID);
}

function absender() {
  return {
    name: process.env.BREVO_SENDER_NAME || SITE.name || "Newsletter",
    email: process.env.BREVO_SENDER_EMAIL,
  };
}

// Basis-Adresse der Seite ohne abschließenden Schrägstrich (für die Links).
function basisUrl() {
  return String(SITE.url || "").replace(/\/+$/, "");
}

async function brevoFetch(pfad, optionen = {}) {
  return fetch(`${API}${pfad}`, {
    ...optionen,
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(optionen.headers || {}),
    },
  });
}

// --- E-Mail-Adresse grob prüfen -------------------------------------------
// Bewusst einfach gehalten (kein vollständiges RFC): ein @, Punkt in der Domain,
// keine Leerzeichen. Die echte Prüfung ist ohnehin die Bestätigungsmail.
function istGueltigeEmail(email) {
  const e = String(email || "").trim();
  return e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function normalisiereEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// --- Signierte Tokens (stateless) -----------------------------------------
// Bestätigungs- und Abmeldelinks tragen einen signierten Token, der die Adresse,
// den Zweck ("confirm"/"unsub") und ein Ablaufdatum enthält. Dadurch braucht es
// keinen Zwischenspeicher: Der Endpunkt prüft die Signatur und liest die Adresse
// direkt aus dem Token.
function tokenSecret() {
  const s = process.env.NEWSLETTER_SECRET || process.env.SESSION_SECRET;
  if (!s) {
    throw new Error(
      "NEWSLETTER_SECRET (oder ersatzweise SESSION_SECRET) ist nicht gesetzt."
    );
  }
  return s;
}

function b64url(text) {
  return Buffer.from(text, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(text) {
  const s = String(text).replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(s, "base64").toString("utf-8");
}

// zweck: "confirm" | "unsub"; gueltigTage: Lebensdauer des Tokens.
function signiereToken(zweck, email, gueltigTage) {
  const payload = {
    z: zweck,
    e: normalisiereEmail(email),
    x: Date.now() + gueltigTage * 24 * 60 * 60 * 1000,
  };
  const p = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", tokenSecret()).update(p).digest("hex");
  return `${p}.${sig}`;
}

// Gibt die (normalisierte) Adresse zurück, wenn Token gültig & passend; sonst null.
function pruefeToken(token, erwarteterZweck) {
  const t = String(token || "");
  const punkt = t.lastIndexOf(".");
  if (punkt === -1) return null;
  const p = t.slice(0, punkt);
  const sig = t.slice(punkt + 1);
  const erwartet = crypto.createHmac("sha256", tokenSecret()).update(p).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(erwartet);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try {
    payload = JSON.parse(b64urlDecode(p));
  } catch {
    return null;
  }
  if (!payload || payload.z !== erwarteterZweck || !payload.e) return null;
  if (!payload.x || Date.now() > Number(payload.x)) return null;
  return payload.e;
}

// Fertige Links bauen (absolut).
function bestaetigungsUrl(email) {
  return `${basisUrl()}/api/newsletter-bestaetigen?token=${encodeURIComponent(
    signiereToken("confirm", email, 7)
  )}`;
}

function abmeldeUrl(email) {
  // Abmeldelinks stehen in versendeten Mails und müssen lange gültig sein.
  return `${basisUrl()}/api/newsletter-abmelden?token=${encodeURIComponent(
    signiereToken("unsub", email, 3650)
  )}`;
}

// --- Transaktionale E-Mail senden -----------------------------------------
// Löst bei Fehler eine Exception aus, damit der Aufrufer den Fehlschlag bemerkt.
async function sendeMail({ an, betreff, html, text, listUnsubscribe }) {
  const body = {
    sender: absender(),
    to: [{ email: an }],
    subject: betreff,
    htmlContent: html,
    textContent: text,
  };
  if (listUnsubscribe) {
    // Ein-Klick-Abmeldung direkt aus dem E-Mail-Programm (RFC 8058).
    body.headers = {
      "List-Unsubscribe": `<${listUnsubscribe}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    };
  }
  const res = await brevoFetch("/smtp/email", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const fehler = await res.text();
    throw new Error(`Brevo-Versand fehlgeschlagen (${res.status}): ${fehler}`);
  }
  return res.json().catch(() => ({}));
}

// --- Kontakte -------------------------------------------------------------

// Kontakt anlegen/aktualisieren und der Sende-Liste hinzufügen (= "bestätigt").
async function kontaktBestaetigen(email) {
  const res = await brevoFetch("/contacts", {
    method: "POST",
    body: JSON.stringify({
      email: normalisiereEmail(email),
      listIds: [listId()],
      updateEnabled: true, // vorhandenen Kontakt aktualisieren statt Fehler
    }),
  });
  // 201 = neu angelegt, 204 = aktualisiert. Beides ok.
  if (res.status === 201 || res.status === 204) return { ok: true };
  const fehler = await res.text();
  throw new Error(`Brevo-Kontakt konnte nicht gespeichert werden (${res.status}): ${fehler}`);
}

// Kontakt vollständig entfernen (Abmeldung = Löschen, "Recht auf Vergessenwerden").
async function kontaktLoeschen(email) {
  const res = await brevoFetch(`/contacts/${encodeURIComponent(normalisiereEmail(email))}`, {
    method: "DELETE",
  });
  if (res.ok || res.status === 404) return { ok: true };
  const fehler = await res.text();
  throw new Error(`Brevo-Kontakt konnte nicht entfernt werden (${res.status}): ${fehler}`);
}

// Ist die Adresse bereits bestätigt (auf der Sende-Liste)?
async function istBestaetigt(email) {
  const res = await brevoFetch(`/contacts/${encodeURIComponent(normalisiereEmail(email))}`);
  if (res.status === 404) return false;
  if (!res.ok) return false;
  const daten = await res.json().catch(() => null);
  const listen = (daten && daten.listIds) || [];
  return listen.map(Number).includes(listId());
}

// Alle bestätigten Abonnenten (E-Mail-Adressen) der Liste – seitenweise geholt.
async function listeAbonnenten() {
  const emails = [];
  const proSeite = 500;
  let offset = 0;
  for (let i = 0; i < 100; i++) {
    // harte Obergrenze (50.000) gegen Endlosschleifen
    const res = await brevoFetch(
      `/contacts/lists/${listId()}/contacts?limit=${proSeite}&offset=${offset}`
    );
    if (!res.ok) {
      const fehler = await res.text();
      throw new Error(`Abonnentenliste konnte nicht geladen werden (${res.status}): ${fehler}`);
    }
    const daten = await res.json().catch(() => ({}));
    const teil = (daten && daten.contacts) || [];
    teil.forEach((k) => {
      if (k && k.email && !k.emailBlacklisted) emails.push(k.email);
    });
    if (teil.length < proSeite) break;
    offset += proSeite;
  }
  return emails;
}

// Konto/Schlüssel prüfen (für die Admin-Diagnose). Gibt bei Erfolg Kontodaten.
async function kontoInfo() {
  const res = await brevoFetch("/account");
  const daten = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, daten };
}

module.exports = {
  newsletterAktiv,
  absender,
  basisUrl,
  istGueltigeEmail,
  normalisiereEmail,
  signiereToken,
  pruefeToken,
  bestaetigungsUrl,
  abmeldeUrl,
  sendeMail,
  kontaktBestaetigen,
  kontaktLoeschen,
  istBestaetigt,
  listeAbonnenten,
  kontoInfo,
};
