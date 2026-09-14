# Checkliste: E-Mail-Versand (Newsletter) startklar machen

**Kurzstand:** Der E-Mail-Versand ist im Code **vollständig fertig** – Anmeldung
mit Double-Opt-In, Bestätigung, Versand beim Veröffentlichen und über den
täglichen Lauf (Meldungen ab 6 Uhr), Abmeldung inkl. Ein-Klick, und ein Test-Knopf im Admin.
Es fehlt also **nichts zu programmieren**, sondern nur die **Einrichtung bei
Brevo**, das **Eintragen der Zugangsdaten in Vercel**, ein **Praxis-Test** und
das **Rechtliche** (Datenschutz/Impressum).

Arbeite die Punkte am besten von oben nach unten ab.

---

## A. Brevo einrichten (der Mail-Dienst)

- [ ] **Konto anlegen** bei [brevo.com](https://www.brevo.com/) (kostenlos, EU-Anbieter, bis 300 Mails/Tag).
- [ ] **Absender-Adresse verifizieren** unter *Senders, Domains & Dedicated IPs*.
      Am besten eine Adresse der eigenen Domain (z. B. `andacht@gfdt-andachten.de`),
      nicht eine fremde GMX-/Gmail-Adresse – das kommt seltener in den Spam.
- [ ] **SPF/DKIM einrichten** (die von Brevo angezeigten DNS-Einträge bei deinem
      Domain-Anbieter hinterlegen). Wichtig für die Zustellbarkeit.
- [ ] **Kontaktliste anlegen** unter *Contacts → Lists* und deren **ID (Zahl)** notieren.
- [ ] **API-Schlüssel erzeugen** unter *SMTP & API → API Keys* und kopieren.

## B. Zugangsdaten in Vercel eintragen

*(Vercel → Project Settings → Environment Variables; Vorlage: `.env.example`)*

- [ ] `BREVO_API_KEY` – der API-Schlüssel aus Schritt A
- [ ] `BREVO_LIST_ID` – die Listen-ID (Zahl) aus Schritt A
- [ ] `BREVO_SENDER_EMAIL` – die **verifizierte** Absender-Adresse
- [ ] `BREVO_SENDER_NAME` *(optional)* – Anzeigename, z. B. „Gerüstet für den Tag“
- [ ] `NEWSLETTER_SECRET` *(empfohlen)* – langer Zufallstext
      (`openssl rand -hex 32`). **Bewusst setzen**, nicht auf `SESSION_SECRET`
      ausweichen: Ändert sich `SESSION_SECRET` später, würden sonst alle
      Abmeldelinks in bereits versendeten Mails ungültig.
- [ ] **Neu deployen.** Erst danach erscheint das E-Mail-Feld im Abo-Menü
      (der Schalter `features.newsletter` prüft die drei Brevo-Werte).

## C. Testen (vor dem echten Start)

- [ ] Im **Admin-Bereich** den Knopf **„Newsletter (E-Mail) testen“** drücken.
      Er prüft Schlüssel + Absender und schickt eine Testmail an die
      Absender-Adresse. → Muss „ok“ melden und die Mail muss ankommen.
- [ ] **Kompletter Durchlauf mit eigener Adresse:**
  - [ ] Auf der Seite oben links **„Abonnieren → Per E-Mail“** die eigene Adresse eintragen.
  - [ ] **Bestätigungsmail** kommt an → auf den Link klicken (Double-Opt-In).
  - [ ] Eine **Andacht veröffentlichen** (oder den täglichen Lauf im Actions-Tab
        mit „force“ starten) → die Andachts-Mail muss ankommen.
  - [ ] **Abmeldelink** in der Mail testen → man landet auf der Abmelde-Seite und
        ist danach aus der Liste raus.
- [ ] **Zustellbarkeit prüfen:** je eine Testmail an **Gmail, GMX/Web.de und
      Outlook** – landet nichts im Spam?

## D. Rechtliches (in Deutschland Pflicht)

Impressum und Datenschutzerklärung sind als Vorlage **angelegt** und in der
Fußzeile verlinkt:

- ✅ **Datenschutzerklärung** (`src/datenschutz.njk` → `/datenschutz/`) – auf den
      tatsächlichen Aufbau zugeschnitten: Brevo (EU, Double-Opt-In, Widerruf),
      Hosting Vercel, Domain/E-Mail STRATO, lokale Schriften, keine Cookies.
- ✅ **Impressum** (`src/impressum.njk` → `/impressum/`) – nach § 5 DDG.
- ✅ **Fußzeile** verlinkt beide Seiten.

- [ ] ⚠️ **Betreiber-Angaben ausfüllen:** in
      [`src/_data/site.js`](src/_data/site.js) unter `betreiber` deinen **Namen,
      Anschrift und Kontakt** eintragen. Solange dort „BITTE-AUSFÜLLEN“ steht, ist
      das Impressum **rechtlich unwirksam**.
- [ ] *(empfohlen)* Vorlage kurz gegenlesen bzw. prüfen lassen – die Texte sind
      sorgfältig, aber keine Rechtsberatung.

## E. Betrieb & Grenzen (gut zu wissen)

- [ ] **Erster täglicher Lauf:** legt `newsletter-gesendet.json` automatisch an und
      verbucht den vorhandenen Bestand als „schon gemailt“ – es wird **nichts
      rückwirkend** verschickt. Nur einmal kurz kontrollieren, dass die Datei
      danach im Repo auftaucht.
- [ ] **300-Mails-am-Tag-Grenze (Free-Tier):** reicht für den Start locker. Erst
      wenn die Abonnentenzahl über ~300 steigt, müsste der Versand aufgeteilt oder
      ein größerer Brevo-Tarif gewählt werden.
- [ ] **Absender auf eigener Domain** (statt Fremdadresse) verbessert die
      Zustellbarkeit deutlich – falls noch nicht geschehen, nachholen.

---

## F. Zur Frage: Push-Benachrichtigung als dritte Abo-Option?

**Kurz:** Ja, technisch möglich – aber es ist deutlich mehr Aufwand als die zwei
vorhandenen Wege, und Telegram deckt den „direkt aufs Handy“-Wunsch schon ab.

**Was es aktuell gibt** (Abo-Menü oben links): **E-Mail** und **Telegram**. Der
RSS-/Atom-Feed existiert weiter unter `/feed.xml`, wird aber bewusst nicht mehr
als sichtbare Option angeboten. Telegram ist faktisch bereits eine
Push-Benachrichtigung aufs Handy.

**„Echte“ Web-Push-Benachrichtigungen** (Browser fragt „Benachrichtigungen
erlauben?“) wären als dritte Option machbar, brauchen aber neu:

- einen **Service Worker** auf der Seite,
- **VAPID-Schlüssel**,
- eine **Ablage für die Abo-Daten** jedes Geräts – das Projekt hat bewusst
  **keine Datenbank** (Telegram/Newsletter merken sich alles über GitHub-JSON
  bzw. Brevo). Für Push bräuchte man entweder wieder eine JSON-Datei im Repo
  (unschön bei vielen Geräten) oder einen kleinen Speicher wie Vercel KV / Upstash,
- Versand-Code im täglichen Lauf **und** beim Veröffentlichen (Bibliothek `web-push`),
- ein Erlauben-Knopf im Abo-Menü.

**Haken:** Auf dem **iPhone** funktioniert Web-Push nur, wenn die Seite vorher
zum Home-Bildschirm „installiert“ wird (PWA); die Zustimmungsrate für
Push-Prompts ist erfahrungsgemäß niedrig; und es sind mehr bewegliche Teile zu
pflegen.

**Empfehlung:** Erst den **E-Mail-Versand live bringen** (diese Checkliste).
Web-Push lohnt sich m. E. nur, wenn viele Leser ausdrücklich danach fragen –
dann als **eigenes kleines Projekt**. Wenn du es willst, schätze ich es ab und
baue es ein.
