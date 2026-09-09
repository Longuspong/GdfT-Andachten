const { isAuthenticated } = require("./_lib/auth");
const { listDir, getFile, putFile, deleteFile } = require("./_lib/github");

const ORDNER = "src/andachten";

// Gleiche Logik wie in eleventy.config.js, damit Slugs zur restlichen Seite passen.
function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Gültiges JSON ist auch gültiges YAML – so entfällt eine YAML-Bibliothek,
// und Sonderzeichen (Anführungszeichen, Doppelpunkte, Umlaute) sind sicher.
function frontMatterZeile(schluessel, wert) {
  if (Array.isArray(wert)) {
    const bereinigt = wert.map((w) => String(w).trim()).filter(Boolean);
    if (!bereinigt.length) return null;
    return `${schluessel}: ${JSON.stringify(bereinigt)}`;
  }
  if (wert === undefined || wert === null || String(wert).trim() === "") return null;
  return `${schluessel}: ${JSON.stringify(String(wert).trim())}`;
}

function baueDatei({ titel, losung, stelle, beschreibung, schlagwoerter, inhalt, entwurf }) {
  const zeilen = ["---"];
  // "entwurf: true" wird als echter YAML-Boolean geschrieben, damit Eleventy
  // die Andacht zuverlässig aus der öffentlichen Seite ausschließt. Bei einer
  // veröffentlichten Andacht wird die Zeile weggelassen.
  if (entwurf) zeilen.push("entwurf: true");
  [
    ["titel", titel],
    ["losung", losung],
    ["stelle", stelle],
    ["beschreibung", beschreibung],
    ["schlagwoerter", schlagwoerter],
  ].forEach(([schluessel, wert]) => {
    const zeile = frontMatterZeile(schluessel, wert);
    if (zeile) zeilen.push(zeile);
  });
  zeilen.push("---", "");
  const body = String(inhalt || "").replace(/\r\n/g, "\n").trim();
  return zeilen.join("\n") + "\n" + body + "\n";
}

function parseFrontMatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, inhalt: raw.trim() };
  const [, fmText, body] = match;
  const data = {};
  fmText.split(/\r?\n/).forEach((zeile) => {
    const m = zeile.match(/^([A-Za-zÄÖÜäöüß_]+):\s*(.*)$/);
    if (!m) return;
    let wert = m[2].trim();
    if (wert === "true") {
      wert = true;
    } else if (wert === "false") {
      wert = false;
    } else if (wert.startsWith("[") || wert.startsWith('"')) {
      try {
        wert = JSON.parse(wert);
      } catch {
        /* Rohwert beibehalten, falls kein gültiges JSON */
      }
    }
    data[m[1]] = wert;
  });
  return { data, inhalt: body.trim() };
}

function pruefeDatum(datum) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum || "")) {
    const fehler = new Error("Datum muss im Format JJJJ-MM-TT vorliegen.");
    fehler.status = 400;
    throw fehler;
  }
}

function sichererDateiname(name) {
  return String(name || "").replace(/[^a-zA-Z0-9._-]/g, "");
}

module.exports = async (req, res) => {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: "Nicht angemeldet." });
    return;
  }

  try {
    if (req.method === "GET") {
      const datei = req.query && req.query.datei;

      if (datei) {
        const safe = sichererDateiname(datei);
        const file = await getFile(`${ORDNER}/${safe}`);
        if (!file) {
          res.status(404).json({ error: "Andacht nicht gefunden." });
          return;
        }
        const { data, inhalt } = parseFrontMatter(file.content);
        const datumMatch = safe.match(/^(\d{4}-\d{2}-\d{2})-/);
        res.status(200).json({
          datei: safe,
          sha: file.sha,
          datum: datumMatch ? datumMatch[1] : "",
          titel: data.titel || "",
          losung: data.losung || "",
          stelle: data.stelle || "",
          beschreibung: data.beschreibung || "",
          schlagwoerter: Array.isArray(data.schlagwoerter) ? data.schlagwoerter : [],
          entwurf: data.entwurf === true,
          inhalt,
        });
        return;
      }

      const eintraege = (await listDir(ORDNER)).filter(
        (i) => i.type === "file" && i.name.endsWith(".md")
      );
      const details = await Promise.all(
        eintraege.map(async (item) => {
          try {
            const file = await getFile(`${ORDNER}/${item.name}`);
            const { data } = parseFrontMatter(file.content);
            const datumMatch = item.name.match(/^(\d{4}-\d{2}-\d{2})-/);
            return {
              datei: item.name,
              datum: datumMatch ? datumMatch[1] : "",
              titel: data.titel || item.name,
              entwurf: data.entwurf === true,
            };
          } catch {
            return { datei: item.name, datum: "", titel: item.name, entwurf: false };
          }
        })
      );
      details.sort((a, b) => (a.datum < b.datum ? 1 : a.datum > b.datum ? -1 : 0));
      res.status(200).json({ eintraege: details });
      return;
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const { titel, losung, stelle, beschreibung, schlagwoerter, inhalt, datum } = body;
      const entwurf = body.entwurf === true;

      if (!titel) {
        res.status(400).json({ error: "Titel ist ein Pflichtfeld." });
        return;
      }
      if (!entwurf && !String(inhalt || "").trim()) {
        res.status(400).json({ error: "Zum Veröffentlichen ist ein Andachtstext nötig." });
        return;
      }
      pruefeDatum(datum);

      let slug = slugify(body.slug || titel);
      if (!slug) slug = "andacht";
      let dateiname = `${datum}-${slug}.md`;

      // Falls der Dateiname schon existiert, eine Nummer anhängen statt zu überschreiben.
      let zaehler = 2;
      while (await getFile(`${ORDNER}/${dateiname}`)) {
        dateiname = `${datum}-${slug}-${zaehler}.md`;
        zaehler++;
      }

      const inhaltDatei = baueDatei({ titel, losung, stelle, beschreibung, schlagwoerter, inhalt, entwurf });
      const nachricht = entwurf ? `Entwurf gespeichert: ${titel}` : `Andacht veröffentlicht: ${titel}`;
      await putFile(`${ORDNER}/${dateiname}`, inhaltDatei, nachricht);
      res.status(200).json({ ok: true, datei: dateiname, entwurf });
      return;
    }

    if (req.method === "PUT") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const { datei, sha, titel, losung, stelle, beschreibung, schlagwoerter, inhalt, datum } = body;
      const entwurf = body.entwurf === true;

      if (!datei || !sha) {
        res.status(400).json({ error: "Datei und sha sind erforderlich." });
        return;
      }
      if (!titel) {
        res.status(400).json({ error: "Titel ist ein Pflichtfeld." });
        return;
      }
      if (!entwurf && !String(inhalt || "").trim()) {
        res.status(400).json({ error: "Zum Veröffentlichen ist ein Andachtstext nötig." });
        return;
      }
      pruefeDatum(datum);

      const alterName = sichererDateiname(datei);
      let slug = slugify(body.slug || titel);
      if (!slug) slug = "andacht";
      const neuerName = `${datum}-${slug}.md`;
      const inhaltDatei = baueDatei({ titel, losung, stelle, beschreibung, schlagwoerter, inhalt, entwurf });
      const nachricht = entwurf ? `Entwurf aktualisiert: ${titel}` : `Andacht veröffentlicht: ${titel}`;

      if (neuerName === alterName) {
        await putFile(`${ORDNER}/${alterName}`, inhaltDatei, nachricht, sha);
        res.status(200).json({ ok: true, datei: alterName, entwurf });
      } else {
        // Datum oder Titel haben sich geändert -> neuer Dateiname nötig:
        // neue Datei anlegen und alte danach entfernen.
        await putFile(`${ORDNER}/${neuerName}`, inhaltDatei, `${nachricht} (umbenannt)`);
        await deleteFile(`${ORDNER}/${alterName}`, `Alte Datei nach Umbenennung entfernt: ${alterName}`, sha);
        res.status(200).json({ ok: true, datei: neuerName, entwurf });
      }
      return;
    }

    if (req.method === "DELETE") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const { datei, sha } = body;
      if (!datei || !sha) {
        res.status(400).json({ error: "Datei und sha sind erforderlich." });
        return;
      }
      const safe = sichererDateiname(datei);
      await deleteFile(`${ORDNER}/${safe}`, `Andacht gelöscht: ${safe}`, sha);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: "Methode nicht erlaubt." });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || "Unbekannter Fehler." });
  }
};
