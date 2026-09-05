/* =========================================================================
   Akkord-Bibliothek – Service Worker
   Macht die App offline nutzbar: App-Shell und Akkord-Daten werden
   zwischengespeichert. Schriften von Google Fonts werden nach dem ersten
   Laden ebenfalls gecacht (mit System-Schrift als Rückfall).
   -------------------------------------------------------------------------
   Bei Änderungen an App-Dateien die Versionsnummer erhöhen – dann lädt
   der neue Stand automatisch nach.
   ========================================================================= */

var VERSION = "akkorde-v1";
var APP_SHELL = [
  "./",
  "./index.html",
  "./app.css",
  "./app.js",
  "./chords.json",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
];

// Installieren: App-Shell in den Cache legen
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(VERSION).then(function (cache) {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// Aktivieren: alte Caches aufräumen
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== VERSION) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

function istFont(url) {
  return (
    url.origin === "https://fonts.googleapis.com" ||
    url.origin === "https://fonts.gstatic.com"
  );
}

// Abrufen: Strategien je nach Anfrage
self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);

  // Navigations-Anfragen: erst Netz, sonst App-Shell aus dem Cache
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(function () {
        return caches.match("./index.html");
      })
    );
    return;
  }

  // Schriften: cache-first, im Hintergrund auffüllen
  if (istFont(url)) {
    event.respondWith(
      caches.open("akkorde-fonts").then(function (cache) {
        return cache.match(req).then(function (treffer) {
          var netz = fetch(req)
            .then(function (res) {
              if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
              return res;
            })
            .catch(function () {
              return treffer;
            });
          return treffer || netz;
        });
      })
    );
    return;
  }

  // Gleiche Herkunft: cache-first mit Netz-Auffüllung
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(function (treffer) {
        if (treffer) return treffer;
        return fetch(req)
          .then(function (res) {
            if (res && res.ok) {
              var kopie = res.clone();
              caches.open(VERSION).then(function (cache) {
                cache.put(req, kopie);
              });
            }
            return res;
          })
          .catch(function () {
            return treffer;
          });
      })
    );
  }
});
