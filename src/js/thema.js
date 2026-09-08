/* =========================================================================
   Design-Umschalter (hell / dunkel)
   -------------------------------------------------------------------------
   Der Schalter oben rechts wechselt zwischen hellem und dunklem Design.
   - Die Wahl wird im Browser gespeichert (localStorage, Schlüssel "thema").
   - Ohne eigene Wahl folgt die Seite automatisch der Systemeinstellung.
   - Das erste Festlegen des Attributs geschieht bereits im <head> (base.njk),
     damit nichts in der falschen Farbe aufblitzt. Hier wird nur noch die
     Bedienung ergänzt.
   ========================================================================= */
(function () {
  var wurzel = document.documentElement;
  var schalter = document.querySelector(".thema-schalter");
  if (!schalter) return;

  var systemDunkel = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

  // Ist gerade das dunkle Design aktiv? Eine ausdrückliche Wahl hat Vorrang,
  // sonst zählt die Systemeinstellung.
  function istDunkel() {
    var wahl = wurzel.getAttribute("data-theme");
    if (wahl === "dark") return true;
    if (wahl === "light") return false;
    return systemDunkel ? systemDunkel.matches : false;
  }

  // Zustand des Schalters für Screenreader aktualisieren.
  function aktualisiere() {
    schalter.setAttribute("aria-checked", istDunkel() ? "true" : "false");
  }

  aktualisiere();

  schalter.addEventListener("click", function () {
    var neu = istDunkel() ? "light" : "dark";
    wurzel.setAttribute("data-theme", neu);
    try {
      localStorage.setItem("thema", neu === "dark" ? "dunkel" : "hell");
    } catch (e) {}
    aktualisiere();
  });

  // Solange keine eigene Wahl getroffen wurde, Systemwechseln folgen.
  if (systemDunkel) {
    var beiSystemwechsel = function () {
      if (wurzel.getAttribute("data-theme")) return; // eigene Wahl hat Vorrang
      aktualisiere();
    };
    if (systemDunkel.addEventListener) {
      systemDunkel.addEventListener("change", beiSystemwechsel);
    } else if (systemDunkel.addListener) {
      systemDunkel.addListener(beiSystemwechsel);
    }
  }
})();
