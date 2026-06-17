# 🍽️ QR-Bestellung

Kunden scannen am Tisch einen QR-Code, bestellen Getränke & Essen, und die Bestellung
erscheint **live** auf deinem iPhone-Dashboard – inklusive Tischnummer und Ton.

Keine App-Installation für Kunden: Der QR-Code öffnet direkt die Bestellseite im Browser.

## Seiten

| Seite | Wer | Zweck |
|-------|-----|-------|
| `/dashboard.html` | **Du** | Live-Eingang aller Bestellungen, „Erledigt"-Button, Ton |
| `/qr.html`        | **Du** | QR-Codes pro Tisch erzeugen & ausdrucken |
| `/order.html?table=3` | **Kunde** | Bestellseite (öffnet sich automatisch durch den QR-Scan) |
| `/` | Übersicht | Startseite mit Links |

Das Menü bearbeitest du in **`menu.json`** (Name, Preise, Artikel). Änderungen wirken sofort.

## Lokal starten (zum Testen)

```bash
npm install
npm start
```
Dann im Browser: <http://localhost:3000>

## Ins Internet stellen (damit Kunden überall scannen können)

Empfohlen: **Render.com** (kostenlos).

1. Code auf GitHub hochladen (neues Repository).
2. Auf <https://render.com> → **New → Web Service** → dein Repo wählen.
3. Render erkennt `render.yaml` automatisch. Sonst manuell:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Nach dem Deploy bekommst du eine Adresse wie `https://qr-bestellung-xxxx.onrender.com`.
5. Diese Adresse auf `/qr.html` eintragen → QR-Codes erzeugen → ausdrucken.

> Hinweis zum kostenlosen Render-Plan: Der Dienst „schläft" nach ~15 Min Inaktivität ein
> und braucht beim ersten Aufruf ein paar Sekunden zum Aufwachen. Für Stoßzeiten ggf.
> kostenpflichtigen Plan wählen.

## So läuft der Betrieb

1. `/qr.html` öffnen, öffentliche Adresse eintragen, Anzahl Tische wählen → **Drucken**.
2. QR-Code je Tisch aufstellen.
3. Auf dem iPhone `/dashboard.html` öffnen → **„Zum Home-Bildschirm"** (wie eine App)
   → einmal **„Ton aktivieren"** antippen.
4. Kunde scannt → bestellt → Bestellung erscheint sofort bei dir mit Signalton.

## Technik

- Node.js + Express, Echtzeit über Server-Sent Events (SSE).
- Bestellungen liegen im Arbeitsspeicher (bei Server-Neustart weg – für kurzlebige
  Bestellungen unkritisch). Preise werden serverseitig validiert.


## Finale Design-Version

Diese Version enthält zusätzlich:
- Apple-Style Glas-Effekt
- animierte Karten und Buttons
- Konfetti nach erfolgreicher Bestellung
- kurzer Geburtstagston nach Bestellung
- Vibration auf unterstützten Smartphones
- Dashboard-Signal bei neuen Bestellungen

## Dashboard Bestell-Counter

Das Dashboard zeigt zusätzlich eine Gesamtübersicht, welche Artikel seit dem Serverstart wie oft bestellt wurden. Erledigte Bestellungen bleiben in dieser Statistik erhalten.
