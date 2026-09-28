// App-installieren-Knopf im Kopf (neben dem Abo-Menü).
//
// Warum das Ganze: Einen Web-Anbieter als „App" zu installieren, sieht in
// jedem Browser anders aus – Chrome/Edge/Android zeigen einen eigenen
// Installieren-Dialog per JavaScript (beforeinstallprompt), Safari/iOS kennt
// so etwas gar nicht (nur manuell über „Teilen" → „Zum Home-Bildschirm") und
// Firefox hat wieder einen anderen Weg. Dieser Knopf blendet je nach Browser
// entweder den nativen Dialog oder eine kurze, passende Anleitung ein.
(function () {
  "use strict";
  var menue = document.getElementById("installieren-menue");
  if (!menue) return;

  function laeuftBereitsAlsApp() {
    try {
      if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
    } catch (e) {}
    return !!window.navigator.standalone; // iOS Safari, bereits zum Home-Bildschirm hinzugefügt
  }
  if (laeuftBereitsAlsApp()) return; // Knopf bleibt versteckt

  var info = menue.querySelector("[data-installieren-info]");
  var schritte = menue.querySelector("[data-installieren-schritte]");
  var aktion = menue.querySelector("[data-installieren-aktion]");

  function zeigeSchritte(liste) {
    if (!schritte) return;
    schritte.innerHTML = "";
    liste.forEach(function (text) {
      var li = document.createElement("li");
      li.textContent = text;
      schritte.appendChild(li);
    });
    if (info) info.hidden = true;
    schritte.hidden = false;
  }

  var ua = window.navigator.userAgent || "";
  var istIOS =
    /iphone|ipad|ipod/i.test(ua) ||
    (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1); // iPadOS meldet sich als Mac
  var istFirefox = /firefox/i.test(ua);
  var istSafari = /safari/i.test(ua) && !/chrome|chromium|crios|edg|android/i.test(ua);

  if (istIOS) {
    zeigeSchritte([
      "Tippe unten auf das Teilen-Symbol (Quadrat mit Pfeil nach oben).",
      "Wähle „Zum Home-Bildschirm\" aus der Liste.",
      "Bestätige oben rechts mit „Hinzufügen\".",
    ]);
  } else if (istFirefox) {
    zeigeSchritte([
      "Öffne das Menü (☰) oben rechts.",
      "Wähle „Installieren\" bzw. „App installieren\", falls vorhanden.",
      "Ist das nicht vorhanden: Lesezeichen setzen und die Seite regelmäßig aufrufen.",
    ]);
  } else if (istSafari) {
    zeigeSchritte([
      "Öffne das Menü „Ablage\" in der Menüleiste oben.",
      "Wähle „Zum Dock hinzufügen\" (ab Safari 17) bzw. setze ein Lesezeichen.",
    ]);
  }
  // Sonst (Chrome, Edge, Samsung Internet, ...): Standardtext stehen lassen –
  // dort meldet sich gleich ggf. "beforeinstallprompt" mit dem echten Knopf.

  // Chrome/Edge/Android (u. Ä.): eigenes Installieren-Angebot statt der
  // Browser-eigenen Mini-Leiste, damit es zum restlichen Design passt.
  window.addEventListener("beforeinstallprompt", function (ev) {
    ev.preventDefault();
    if (info) info.hidden = true;
    if (schritte) schritte.hidden = true;
    if (!aktion) return;
    aktion.hidden = false;
    aktion.addEventListener("click", function () {
      aktion.disabled = true;
      ev.prompt();
      ev.userChoice.finally(function () {
        aktion.hidden = true;
        aktion.disabled = false;
      });
    });
  });

  window.addEventListener("appinstalled", function () {
    menue.hidden = true;
    menue.removeAttribute("open");
  });

  // Schließen bei Klick daneben oder Escape (wie beim Abo-Menü).
  document.addEventListener("click", function (ev) {
    if (menue.hasAttribute("open") && !menue.contains(ev.target)) menue.removeAttribute("open");
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && menue.hasAttribute("open")) {
      menue.removeAttribute("open");
      var knopf = menue.querySelector("summary");
      if (knopf) knopf.focus();
    }
  });

  menue.hidden = false;

  // Service Worker: nur registrieren, wenn der Browser das überhaupt kann.
  // Er dient ausschließlich dazu, dass Chrome/Edge/Android die Seite als
  // installierbar einstufen (siehe src/sw.js) – ohne ihn gäbe es dort gar
  // keinen Installieren-Dialog.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(function () {});
  }
})();
