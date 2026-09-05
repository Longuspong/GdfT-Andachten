/* =========================================================================
   Akkord-Bibliothek – App-Logik
   Reines Vanilla-JavaScript, kein Framework.
   Zeichnet Griffbilder als SVG allein aus den Daten in chords.json.
   ========================================================================= */

(function () {
  "use strict";

  // Saiten von tief nach hoch – so ist auch das "frets"-Array aufgebaut.
  var SAITEN = ["E", "A", "D", "G", "B", "e"];
  var FAV_KEY = "akkordbibliothek:favoriten";
  var TYP_LABELS = {
    Dur: "Dur",
    Moll: "Moll",
    sus: "sus",
    "7": "7er",
    "9": "9er",
    Slash: "Slash",
  };

  var state = {
    akkorde: [],
    favoriten: ladeFavoriten(),
    filter: "alle", // "alle" | "favoriten" | ein Typ
    suche: "",
  };

  // --- Elemente ---
  var el = {
    suchfeld: document.getElementById("suchfeld"),
    chips: document.getElementById("chips"),
    liste: document.getElementById("liste"),
    status: document.getElementById("status"),
    zufall: document.getElementById("zufall"),
    viewList: document.getElementById("view-list"),
    viewDetail: document.getElementById("view-detail"),
    zurueck: document.getElementById("zurueck"),
    detailName: document.getElementById("detail-name"),
    detailTyp: document.getElementById("detail-typ"),
    detailGriff: document.getElementById("detail-griff"),
    detailToene: document.getElementById("detail-toene"),
    detailTab: document.getElementById("detail-tab"),
    detailStern: document.getElementById("detail-stern"),
    detailZufall: document.getElementById("detail-zufall"),
    install: document.getElementById("install"),
  };

  // =======================================================================
  //  Favoriten (localStorage)
  // =======================================================================
  function ladeFavoriten() {
    try {
      var roh = localStorage.getItem(FAV_KEY);
      var arr = roh ? JSON.parse(roh) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function speichereFavoriten() {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(state.favoriten));
    } catch (e) {
      /* z. B. privater Modus – dann eben nur für diese Sitzung */
    }
  }

  function istFavorit(name) {
    return state.favoriten.indexOf(name) !== -1;
  }

  function toggleFavorit(name) {
    var i = state.favoriten.indexOf(name);
    if (i === -1) state.favoriten.push(name);
    else state.favoriten.splice(i, 1);
    speichereFavoriten();
  }

  // =======================================================================
  //  Griffbild als SVG zeichnen (das Herzstück)
  // =======================================================================
  function griffbildSVG(akkord) {
    var strings = 6;
    var gedrueckt = akkord.frets.filter(function (f) {
      return f > 0;
    });
    var maxFret = gedrueckt.length ? Math.max.apply(null, gedrueckt) : 0;
    var base = akkord.baseFret || 1;
    var rows = Math.max(4, maxFret - base + 1);

    // Geometrie
    var hatPosition = base > 1; // Bundnummer links statt Sattel
    var sx = 36; // Saitenabstand
    var sy = 42; // Bundabstand
    var padL = hatPosition ? 46 : 22; // links (Platz für "N fr")
    var padR = 22;
    var padT = 46; // oben (✕/○-Marker)
    var padB = 28; // unten (Saitennamen)
    var gridW = (strings - 1) * sx;
    var gridH = rows * sy;
    var W = padL + gridW + padR;
    var H = padT + gridH + padB;
    var r = 13; // Radius der Fingerpunkte

    function xOf(i) {
      return padL + i * sx;
    }
    function yOf(j) {
      return padT + j * sy;
    }

    var parts = [];
    parts.push(
      '<svg class="griffbild" viewBox="0 0 ' +
        W +
        " " +
        H +
        '" role="img" aria-label="Griffbild ' +
        esc(akkord.name) +
        '">'
    );

    // Bünde (waagerechte Linien)
    for (var j = 0; j <= rows; j++) {
      parts.push(
        '<line class="griff-bund" x1="' +
          xOf(0) +
          '" y1="' +
          yOf(j) +
          '" x2="' +
          xOf(strings - 1) +
          '" y2="' +
          yOf(j) +
          '"/>'
      );
    }
    // Saiten (senkrechte Linien)
    for (var i = 0; i < strings; i++) {
      parts.push(
        '<line class="griff-saite" x1="' +
          xOf(i) +
          '" y1="' +
          yOf(0) +
          '" x2="' +
          xOf(i) +
          '" y2="' +
          yOf(rows) +
          '"/>'
      );
    }

    // Sattel (dicker Balken) nur wenn das Diagramm am Nullbund beginnt
    if (base === 1) {
      parts.push(
        '<rect class="griff-sattel" x="' +
          (xOf(0) - 2) +
          '" y="' +
          (yOf(0) - 5) +
          '" width="' +
          (gridW + 4) +
          '" height="6"/>'
      );
    } else {
      // Bundnummer links, z. B. "4 fr"
      parts.push(
        '<text class="griff-pos" x="' +
          (padL - 10) +
          '" y="' +
          (yOf(0) + sy * 0.5) +
          '" text-anchor="end" dominant-baseline="middle">' +
          base +
          " fr</text>"
      );
    }

    // ✕ (gedämpft) und ○ (leer) über dem Steg
    for (var s = 0; s < strings; s++) {
      var f = akkord.frets[s];
      var mx = xOf(s);
      var my = padT - 20;
      if (f === -1) {
        parts.push(
          '<text class="griff-x" x="' +
            mx +
            '" y="' +
            my +
            '" text-anchor="middle" dominant-baseline="central">✕</text>'
        );
      } else if (f === 0) {
        parts.push(
          '<circle class="griff-o" cx="' + mx + '" cy="' + my + '" r="6" fill="none"/>'
        );
      }
    }

    // Barré-Balken (hinter den Fingerpunkten)
    var barres = akkord.barres || [];
    for (var b = 0; b < barres.length; b++) {
      var barre = barres[b];
      var brow = barre.fret - base + 1;
      var by = yOf(brow) - sy / 2;
      var bx1 = xOf(barre.fromString - 1);
      var bx2 = xOf(barre.toString - 1);
      parts.push(
        '<rect class="griff-barre" x="' +
          (bx1 - r) +
          '" y="' +
          (by - r) +
          '" width="' +
          (bx2 - bx1 + 2 * r) +
          '" height="' +
          2 * r +
          '" rx="' +
          r +
          '" ry="' +
          r +
          '"/>'
      );
    }

    // Fingerpunkte mit Fingernummern
    for (var k = 0; k < strings; k++) {
      var fret = akkord.frets[k];
      if (fret > 0) {
        var row = fret - base + 1;
        var cx = xOf(k);
        var cy = yOf(row) - sy / 2;
        parts.push('<circle class="griff-punkt" cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>');
        var finger = akkord.fingers[k];
        if (finger > 0) {
          parts.push(
            '<text class="griff-finger" x="' +
              cx +
              '" y="' +
              cy +
              '" text-anchor="middle" dominant-baseline="central">' +
              finger +
              "</text>"
          );
        }
      }
    }

    // Saitennamen unten (E A D G B e)
    for (var n = 0; n < strings; n++) {
      parts.push(
        '<text class="griff-saitename" x="' +
          xOf(n) +
          '" y="' +
          (yOf(rows) + 16) +
          '" text-anchor="middle" dominant-baseline="middle">' +
          SAITEN[n] +
          "</text>"
      );
    }

    parts.push("</svg>");
    return parts.join("");
  }

  // Kurzschreibweise, z. B. "x 5 4 5 5 x"
  function kurzschreibweise(akkord) {
    return akkord.frets
      .map(function (f) {
        return f < 0 ? "x" : String(f);
      })
      .join(" ");
  }

  // =======================================================================
  //  Filtern & Sortieren
  // =======================================================================
  function normalisiere(str) {
    return (str || "").toLowerCase().replace(/\s+/g, "");
  }

  function gefilterteAkkorde() {
    var q = normalisiere(state.suche);
    var liste = state.akkorde.filter(function (a) {
      // Typ-/Favoriten-Filter
      if (state.filter === "favoriten") {
        if (!istFavorit(a.name)) return false;
      } else if (state.filter !== "alle") {
        if (a.type !== state.filter) return false;
      }
      // Suche nach Name
      if (q && normalisiere(a.name).indexOf(q) === -1) return false;
      return true;
    });

    // Favoriten nach oben, sonst ursprüngliche Reihenfolge
    liste.sort(function (a, b) {
      var fa = istFavorit(a.name) ? 0 : 1;
      var fb = istFavorit(b.name) ? 0 : 1;
      if (fa !== fb) return fa - fb;
      return a._index - b._index;
    });
    return liste;
  }

  // =======================================================================
  //  Rendern: Filter-Chips
  // =======================================================================
  function renderChips() {
    var typen = [];
    state.akkorde.forEach(function (a) {
      if (typen.indexOf(a.type) === -1) typen.push(a.type);
    });

    var chips = [{ key: "alle", label: "Alle" }];
    if (state.favoriten.length) chips.push({ key: "favoriten", label: "★ Favoriten" });
    typen.forEach(function (t) {
      chips.push({ key: t, label: TYP_LABELS[t] || t });
    });

    el.chips.innerHTML = "";
    chips.forEach(function (c) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip" + (state.filter === c.key ? " chip--aktiv" : "");
      btn.textContent = c.label;
      btn.setAttribute("aria-pressed", state.filter === c.key ? "true" : "false");
      btn.addEventListener("click", function () {
        state.filter = c.key;
        renderChips();
        renderListe();
      });
      el.chips.appendChild(btn);
    });
  }

  // =======================================================================
  //  Rendern: Liste
  // =======================================================================
  function renderListe() {
    var liste = gefilterteAkkorde();
    el.liste.innerHTML = "";

    if (!liste.length) {
      el.status.textContent = "Kein Akkord gefunden.";
      return;
    }
    el.status.textContent =
      liste.length + (liste.length === 1 ? " Akkord" : " Akkorde");

    var frag = document.createDocumentFragment();
    liste.forEach(function (a) {
      var li = document.createElement("li");
      li.className = "karte";

      var link = document.createElement("a");
      link.className = "karte__link";
      link.href = "#/akkord/" + encodeURIComponent(a.name);
      link.innerHTML =
        '<span class="karte__griff">' +
        griffbildSVG(a) +
        "</span>" +
        '<span class="karte__name">' +
        esc(a.name) +
        "</span>" +
        '<span class="karte__typ">' +
        esc(TYP_LABELS[a.type] || a.type) +
        "</span>";

      var stern = document.createElement("button");
      stern.type = "button";
      stern.className = "stern" + (istFavorit(a.name) ? " stern--aktiv" : "");
      stern.setAttribute("aria-pressed", istFavorit(a.name) ? "true" : "false");
      stern.setAttribute("aria-label", "Favorit: " + a.name);
      stern.innerHTML = '<span aria-hidden="true">' + (istFavorit(a.name) ? "★" : "☆") + "</span>";
      stern.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        toggleFavorit(a.name);
        renderChips();
        renderListe();
      });

      li.appendChild(link);
      li.appendChild(stern);
      frag.appendChild(li);
    });
    el.liste.appendChild(frag);
  }

  // =======================================================================
  //  Rendern: Detailansicht
  // =======================================================================
  function findeAkkord(name) {
    for (var i = 0; i < state.akkorde.length; i++) {
      if (state.akkorde[i].name === name) return state.akkorde[i];
    }
    return null;
  }

  function renderDetail(akkord) {
    el.detailName.textContent = akkord.name;
    el.detailTyp.textContent = TYP_LABELS[akkord.type] || akkord.type;
    el.detailGriff.innerHTML = griffbildSVG(akkord);
    el.detailToene.textContent = akkord.notes.join(" · ");
    el.detailTab.textContent = kurzschreibweise(akkord);

    var fav = istFavorit(akkord.name);
    el.detailStern.className = "stern stern--gross" + (fav ? " stern--aktiv" : "");
    el.detailStern.setAttribute("aria-pressed", fav ? "true" : "false");
    el.detailStern.querySelector(".stern__icon").textContent = fav ? "★" : "☆";
    el.detailStern.onclick = function () {
      toggleFavorit(akkord.name);
      renderDetail(akkord);
    };
  }

  // =======================================================================
  //  Routing (per URL-Anker)
  // =======================================================================
  function zeigeAnsicht(welche) {
    var detail = welche === "detail";
    el.viewDetail.hidden = !detail;
    el.viewList.hidden = detail;
  }

  function router() {
    var hash = location.hash || "";
    var m = hash.match(/^#\/akkord\/(.+)$/);
    if (m) {
      var name = decodeURIComponent(m[1]);
      var akkord = findeAkkord(name);
      if (akkord) {
        renderDetail(akkord);
        zeigeAnsicht("detail");
        window.scrollTo(0, 0);
        return;
      }
    }
    zeigeAnsicht("liste");
  }

  function oeffne(name) {
    location.hash = "#/akkord/" + encodeURIComponent(name);
  }

  function zufaelligerAkkord() {
    if (!state.akkorde.length) return;
    var a = state.akkorde[Math.floor(Math.random() * state.akkorde.length)];
    oeffne(a.name);
  }

  // =======================================================================
  //  Hilfsfunktionen
  // =======================================================================
  function esc(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // =======================================================================
  //  Start
  // =======================================================================
  function wireEvents() {
    el.suchfeld.addEventListener("input", function () {
      state.suche = el.suchfeld.value;
      renderListe();
    });
    el.zufall.addEventListener("click", zufaelligerAkkord);
    el.detailZufall.addEventListener("click", zufaelligerAkkord);
    el.zurueck.addEventListener("click", function () {
      if (history.length > 1) history.back();
      else location.hash = "";
    });
    window.addEventListener("hashchange", router);
  }

  function init(daten) {
    state.akkorde = daten.map(function (a, i) {
      a._index = i;
      return a;
    });
    wireEvents();
    renderChips();
    renderListe();
    router();
  }

  function ladefehler() {
    el.status.textContent =
      "Die Akkorde konnten nicht geladen werden. Bitte die Seite neu laden.";
  }

  fetch("chords.json", { cache: "no-cache" })
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(init)
    .catch(ladefehler);

  // =======================================================================
  //  PWA: Service Worker + Installations-Knopf
  // =======================================================================
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {
        /* Offline-Funktion ist optional – App läuft auch ohne */
      });
    });
  }

  var installEvent = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    installEvent = e;
    if (el.install) el.install.hidden = false;
  });
  if (el.install) {
    el.install.addEventListener("click", function () {
      if (!installEvent) return;
      installEvent.prompt();
      installEvent.userChoice.finally(function () {
        installEvent = null;
        el.install.hidden = true;
      });
    });
  }
  window.addEventListener("appinstalled", function () {
    if (el.install) el.install.hidden = true;
  });
})();
