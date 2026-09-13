// Kleine Verbesserung für das Abo-Menü (oben links).
// Das Menü ist als <details> gebaut und funktioniert bereits ohne JavaScript.
// Hier machen wir es nur angenehmer: Es schließt sich, wenn man daneben klickt
// oder Escape drückt.
(function () {
  "use strict";
  var abo = document.querySelector(".abo");
  if (!abo) return;

  function schliessen() {
    abo.removeAttribute("open");
  }

  // Klick außerhalb des Menüs -> schließen.
  document.addEventListener("click", function (ev) {
    if (abo.hasAttribute("open") && !abo.contains(ev.target)) schliessen();
  });

  // Escape -> schließen und den Fokus zurück auf den Knopf.
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && abo.hasAttribute("open")) {
      schliessen();
      var knopf = abo.querySelector("summary");
      if (knopf) knopf.focus();
    }
  });
})();
