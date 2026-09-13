// E-Mail-Versand der Andachten an die bestätigten Abonnenten – das Gegenstück zu
// api/_lib/melden.js (Telegram). Aufgerufen von zwei Stellen:
//   1. api/taeglich.js  – der tägliche 6-Uhr-Lauf mailt die neu fällig gewordenen
//      (vorgeplanten) Andachten.
//   2. api/andachten.js – beim Veröffentlichen im Admin: ist die Andacht sofort
//      sichtbar, wird sie direkt gemailt.
//
// Beide Wege teilen sich denselben "schon gemailt"-Merker
// (newsletter-gesendet.json im Repo) – getrennt vom Telegram-Merker, damit beide
// Kanäle unabhängig genau EINMAL zustellen. Ist der Newsletter nicht konfiguriert
// (siehe brevo.js), passiert nichts.

const { getFile, putFile } = require("./github");
const SITE = require("../../src/_data/site.js");
const {
  MELDE_FENSTER_TAGE,
  heuteBerlin,
  stundeBerlin,
  verschiebeTage,
  istFaelligJetzt,
  imMeldefenster,
  andachtUrl,
  warteBisErreichbar,
  frontMatterFelder,
  listeAndachten,
} = require("./melden");
const {
  newsletterAktiv,
  sendeMail,
  listeAbonnenten,
  abmeldeUrl,
} = require("./brevo");

const ORDNER = "src/andachten";
const STATUS_DATEI = "newsletter-gesendet.json";

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

// --- E-Mail bauen (schlicht, in jedem Mail-Programm lesbar; Inline-Styles) ---
// Bewusst KEINE Markdown-Wiedergabe des ganzen Textes (das wäre in E-Mail-HTML
// aufwendig und fehleranfällig). Stattdessen: Titel, Losung, kurze Einleitung und
// ein deutlicher Link zur ganzen Andacht auf der Seite.
function baueAndachtMail({ datum, slug, felder, abmelde }) {
  const name = SITE.name || "Andachten";
  const titel = (felder && felder.titel) || slug;
  const losung = (felder && felder.losung) || "";
  const stelle = (felder && felder.stelle) || "";
  const beschreibung = (felder && felder.beschreibung) || "";
  const url = andachtUrl(datum, slug);

  const betreff = titel;

  const losungHtml = losung
    ? `<p style="margin:0 0 1rem;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:17px;line-height:1.6;color:#1f3550;">„${escapeHTML(
        losung
      )}“${stelle ? ` <span style="font-style:normal;font-size:14px;color:#6a6f78;">(${escapeHTML(stelle)})</span>` : ""}</p>`
    : "";
  const beschreibungHtml = beschreibung
    ? `<p style="margin:0 0 1.4rem;font-size:16px;line-height:1.65;color:#29303a;">${escapeHTML(
        beschreibung
      )}</p>`
    : "";

  const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f1e7;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;font-family:Arial,Helvetica,sans-serif;color:#29303a;">
    <p style="margin:0 0 4px;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;color:#6a6f78;">${escapeHTML(
      name
    )} · Andacht des Tages</p>
    <div style="background:#fffdf8;border:1px solid #e6ddca;border-top:4px solid #c39a45;border-radius:12px;padding:22px 22px 24px;">
      <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.25;color:#1f3550;">${escapeHTML(
        titel
      )}</h1>
      ${losungHtml}
      ${beschreibungHtml}
      <p style="margin:1.2rem 0 0;">
        <a href="${escapeHTML(url)}" style="display:inline-block;background:#1f3550;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:9px;font-weight:bold;font-size:16px;">Ganze Andacht lesen →</a>
      </p>
    </div>
    <p style="margin:20px 4px 0;font-size:12px;line-height:1.6;color:#6a6f78;">
      Du erhältst diese Mail, weil du die Andachten von ${escapeHTML(name)} abonniert hast.<br>
      <a href="${escapeHTML(abmelde)}" style="color:#6a6f78;">Vom Newsletter abmelden</a>
    </p>
  </div>
</body></html>`;

  const text =
    `${titel}\n` +
    (losung ? `\n„${losung}“${stelle ? ` (${stelle})` : ""}\n` : "") +
    (beschreibung ? `\n${beschreibung}\n` : "") +
    `\nGanze Andacht lesen:\n${url}\n` +
    `\n—\nDu erhältst diese Mail, weil du die Andachten von ${name} abonniert hast.\n` +
    `Abmelden: ${abmelde}\n`;

  return { betreff, html, text };
}

// Eine Andacht an ALLE bestätigten Abonnenten senden (je eine Mail mit eigenem
// Abmeldelink). Einzelne fehlgeschlagene Adressen brechen den Lauf nicht ab.
async function sendeAnAlleAbonnenten({ datum, slug, felder }) {
  const empfaenger = await listeAbonnenten();
  let gesendet = 0;
  let fehler = 0;
  for (const email of empfaenger) {
    try {
      const { betreff, html, text } = baueAndachtMail({
        datum,
        slug,
        felder,
        abmelde: abmeldeUrl(email),
      });
      await sendeMail({
        an: email,
        betreff,
        html,
        text,
        listUnsubscribe: abmeldeUrl(email),
      });
      gesendet++;
    } catch {
      fehler++;
    }
  }
  return { empfaenger: empfaenger.length, gesendet, fehler };
}

// --- Merker (bereits gemailte Dateinamen) ---------------------------------
async function ladeStatus() {
  const datei = await getFile(STATUS_DATEI);
  if (!datei) return { vorhanden: false, sha: undefined, gesendet: [] };
  let gesendet = [];
  try {
    gesendet = JSON.parse(datei.content).gesendet || [];
  } catch {
    gesendet = [];
  }
  return { vorhanden: true, sha: datei.sha, gesendet };
}

async function speichereStatus(gesendet, sha, nachricht) {
  await putFile(STATUS_DATEI, JSON.stringify({ gesendet }, null, 2) + "\n", nachricht, sha);
}

// Ersteinrichtung: den bereits fälligen Bestand als "gemailt" verbuchen, ohne
// rückwirkend zu versenden (sonst bekäme jeder neue Abonnent beim ersten Lauf das
// ganze Archiv). Ab dann werden nur neu fällige Andachten gemailt.
async function initStatusMitBestand(alle, heute) {
  const bestand = alle.filter((a) => a.datum <= heute).map((a) => a.datei);
  await speichereStatus(
    bestand,
    undefined,
    "Newsletter-Status initialisiert (Bestand nicht rückwirkend gemailt)"
  );
  return { ersteEinrichtung: true, gemerkt: bestand.length, gemailt: 0 };
}

// --- Weg 1: Batch (täglicher Lauf) ----------------------------------------
async function maileFaelligeAndachten() {
  if (!newsletterAktiv()) {
    return { uebersprungen: true, grund: "Newsletter nicht konfiguriert." };
  }
  const heute = heuteBerlin();
  const status = await ladeStatus();
  const alle = await listeAndachten();

  if (!status.vorhanden) {
    return initStatusMitBestand(alle, heute);
  }

  const frueheste = verschiebeTage(heute, -MELDE_FENSTER_TAGE);
  const kandidaten = alle
    .filter(
      (a) => a.datum <= heute && a.datum >= frueheste && !status.gesendet.includes(a.datei)
    )
    .sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0));

  const gesendet = status.gesendet.slice();
  const gemailt = [];
  for (const a of kandidaten) {
    const file = await getFile(`${ORDNER}/${a.datei}`);
    if (!file) continue;
    const felder = frontMatterFelder(file.content);
    if (felder.entwurf === true) continue; // Entwürfe nicht mailen
    // Kurz warten, bis die Seite online ist (schöner Link) – nicht blockierend.
    await warteBisErreichbar(andachtUrl(a.datum, a.slug));
    await sendeAnAlleAbonnenten({ datum: a.datum, slug: a.slug, felder });
    gesendet.push(a.datei);
    gemailt.push(a.datei);
  }

  if (gemailt.length) {
    await speichereStatus(gesendet, status.sha, `Newsletter: ${gemailt.length} Andacht(en) gemailt`);
  }
  return { ersteEinrichtung: false, gemailt: gemailt.length, dateien: gemailt };
}

// --- Weg 2: Sofort beim Veröffentlichen -----------------------------------
// Mailt EINE gerade veröffentlichte Andacht, aber nur wenn sie jetzt bereits
// öffentlich sichtbar ist. Vorgeplante/vor-6-Uhr-Andachten übernimmt der Cron.
async function maileAndachtFallsFaellig({ datei, datum, slug, felder, alterName }) {
  if (!newsletterAktiv()) return { uebersprungen: true, grund: "nicht-konfiguriert" };
  if (felder && felder.entwurf === true) return { uebersprungen: true, grund: "entwurf" };

  const status = await ladeStatus();

  if (!status.vorhanden) {
    const alle = await listeAndachten();
    await initStatusMitBestand(alle, heuteBerlin());
    return { uebersprungen: true, grund: "erste-einrichtung" };
  }
  if (status.gesendet.includes(datei)) {
    return { uebersprungen: true, grund: "bereits-gemailt" };
  }
  // Umbenennung einer bereits gemailten Andacht: Merker umziehen, nicht neu mailen.
  if (alterName && status.gesendet.includes(alterName)) {
    const gesendet = status.gesendet.filter((n) => n !== alterName);
    gesendet.push(datei);
    await speichereStatus(gesendet, status.sha, `Newsletter-Merker umbenannt: ${datei}`);
    return { uebersprungen: true, grund: "umbenannt-bereits-gemailt" };
  }

  const heute = heuteBerlin();
  if (!imMeldefenster(datum, heute) || !istFaelligJetzt(datum, heute, stundeBerlin())) {
    return { uebersprungen: true, grund: "noch-nicht-faellig" };
  }

  // Vollständige Felder (Losung, Bibelstelle, Kurzbeschreibung) frisch aus der
  // Datei lesen, damit die Mail alles enthält – der Aufrufer übergibt evtl. nur
  // den Titel.
  const file = await getFile(`${ORDNER}/${datei}`);
  const felderVoll = file ? frontMatterFelder(file.content) : felder || {};
  if (felderVoll.entwurf === true) return { uebersprungen: true, grund: "entwurf" };

  await warteBisErreichbar(andachtUrl(datum, slug));
  const ergebnis = await sendeAnAlleAbonnenten({ datum, slug, felder: felderVoll });
  const gesendet = status.gesendet.filter((n) => n !== alterName);
  gesendet.push(datei);
  await speichereStatus(gesendet, status.sha, `Newsletter: Andacht gemailt (${datei})`);
  return { gemailt: 1, datei, ...ergebnis };
}

module.exports = {
  baueAndachtMail,
  sendeAnAlleAbonnenten,
  maileFaelligeAndachten,
  maileAndachtFallsFaellig,
};
