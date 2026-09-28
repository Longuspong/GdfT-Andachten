// Minimaler Service Worker. Er wird nur gebraucht, damit Chrome/Edge/Android
// die Seite überhaupt als installierbare App erkennen (Voraussetzung für den
// nativen Installieren-Dialog, siehe src/js/installieren.js) – bewusst ohne
// Offline-Zwischenspeicherung, damit nie veraltete Inhalte ausgeliefert
// werden.
self.addEventListener("fetch", function () {});
