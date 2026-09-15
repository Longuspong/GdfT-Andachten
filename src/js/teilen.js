// Teilen-Knopf auf der Leseseite.
// Nutzt auf dem Handy das native Teilen-Menü (Web Share API). Wo das nicht
// vorhanden ist (v. a. am Desktop), wird der Link in die Zwischenablage kopiert
// und der Knopf meldet kurz „Link kopiert".
(function () {
  "use strict";
  var knopf = document.querySelector("[data-teilen]");
  if (!knopf) return;

  var textEl = knopf.querySelector(".teilen__text");
  var standard = textEl ? textEl.textContent : "Teilen";
  var timer = null;

  function rueckmeldung(text) {
    if (!textEl) return;
    textEl.textContent = text;
    knopf.classList.add("teilen--ok");
    clearTimeout(timer);
    timer = setTimeout(function () {
      textEl.textContent = standard;
      knopf.classList.remove("teilen--ok");
    }, 2000);
  }

  async function inZwischenablage(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      return;
    }
    // Älterer Rückfall ohne Clipboard-API.
    var feld = document.createElement("input");
    feld.value = url;
    feld.setAttribute("readonly", "");
    feld.style.position = "absolute";
    feld.style.left = "-9999px";
    document.body.appendChild(feld);
    feld.select();
    document.execCommand("copy");
    document.body.removeChild(feld);
  }

  knopf.addEventListener("click", async function () {
    var url = location.href;
    var titel = knopf.getAttribute("data-titel") || document.title;

    if (navigator.share) {
      try {
        await navigator.share({ title: titel, url: url });
        return;
      } catch (e) {
        // Abbruch durch den Nutzer -> nichts weiter tun.
        if (e && e.name === "AbortError") return;
        // Sonst: unten auf Kopieren zurückfallen.
      }
    }

    try {
      await inZwischenablage(url);
      rueckmeldung("Link kopiert");
    } catch (e) {
      rueckmeldung("Kopieren nicht möglich");
    }
  });
})();
