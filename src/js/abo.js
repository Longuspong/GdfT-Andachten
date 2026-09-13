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

  // --- E-Mail-Anmeldung ohne Seitenwechsel ---------------------------------
  // Das Formular funktioniert auch ohne JavaScript (normaler POST). Ist JS da,
  // schicken wir die Anmeldung per fetch und zeigen die Rückmeldung direkt im
  // Menü an, ohne die Seite zu verlassen.
  var formular = abo.querySelector(".abo__mail");
  if (formular) {
    var status = formular.querySelector(".abo__mail-status");
    var feld = formular.querySelector(".abo__mail-feld");
    var knopf = formular.querySelector(".abo__mail-knopf");

    function zeigeStatus(text, art) {
      if (!status) return;
      status.textContent = text;
      status.className = "abo__mail-status" + (art ? " " + art : "");
    }

    formular.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var email = feld ? feld.value.trim() : "";
      if (!email) return;
      if (knopf) knopf.disabled = true;
      zeigeStatus("Einen Moment …", "");

      fetch(formular.action, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: email }),
      })
        .then(function (res) {
          return res.json().then(function (daten) {
            return { ok: res.ok, daten: daten || {} };
          });
        })
        .then(function (r) {
          if (r.ok && r.daten.ok) {
            zeigeStatus(
              r.daten.meldung || "Fast geschafft! Bitte bestätige die Mail in deinem Postfach.",
              "erfolg"
            );
            if (feld) feld.value = "";
          } else {
            zeigeStatus(
              (r.daten && r.daten.error) || "Anmeldung fehlgeschlagen. Bitte später erneut versuchen.",
              "fehler"
            );
          }
        })
        .catch(function () {
          zeigeStatus("Keine Verbindung. Bitte später erneut versuchen.", "fehler");
        })
        .then(function () {
          if (knopf) knopf.disabled = false;
        });
    });
  }
})();
