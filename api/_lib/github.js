// Liest/schreibt Dateien direkt im GitHub-Repo über die Contents-API.
// Jeder Commit löst automatisch ein neues Vercel-Deployment aus – es gibt
// also keine eigene Datenbank, GitHub ist die "Datenbank".

const API = "https://api.github.com";

function config() {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    throw new Error(
      "GitHub-Umgebungsvariablen fehlen (GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO)."
    );
  }
  return {
    token: GITHUB_TOKEN,
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    branch: GITHUB_BRANCH || "main",
  };
}

async function ghFetch(path, options = {}) {
  const { token } = config();
  return fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });
}

// Listet den Inhalt eines Verzeichnisses (ohne Dateiinhalte).
async function listDir(dirPath) {
  const { owner, repo, branch } = config();
  const res = await ghFetch(
    `/repos/${owner}/${repo}/contents/${dirPath}?ref=${encodeURIComponent(branch)}`
  );
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Verzeichnis konnte nicht gelesen werden (${res.status}).`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// Liest eine einzelne Datei (Inhalt + sha, letzteres wird zum Überschreiben/Löschen benötigt).
async function getFile(filePath) {
  const { owner, repo, branch } = config();
  const res = await ghFetch(
    `/repos/${owner}/${repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Datei konnte nicht gelesen werden (${res.status}).`);
  const data = await res.json();
  const content = Buffer.from(data.content, "base64").toString("utf-8");
  return { content, sha: data.sha };
}

// Legt eine Datei neu an oder überschreibt sie (wenn sha übergeben wird).
async function putFile(filePath, content, message, sha) {
  const { owner, repo, branch } = config();
  const body = {
    message,
    content: Buffer.from(content, "utf-8").toString("base64"),
    branch,
  };
  if (sha) body.sha = sha;
  const res = await ghFetch(`/repos/${owner}/${repo}/contents/${filePath}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Speichern in GitHub fehlgeschlagen (${res.status}): ${err}`);
  }
  return res.json();
}

// Löscht eine Datei (sha der aktuellen Version ist Pflicht).
async function deleteFile(filePath, message, sha) {
  const { owner, repo, branch } = config();
  const res = await ghFetch(`/repos/${owner}/${repo}/contents/${filePath}`, {
    method: "DELETE",
    body: JSON.stringify({ message, sha, branch }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Löschen in GitHub fehlgeschlagen (${res.status}): ${err}`);
  }
  return res.json();
}

module.exports = { listDir, getFile, putFile, deleteFile };
