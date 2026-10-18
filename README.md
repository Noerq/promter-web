# Promter

**Eingabemaske für bessere KI-Prompts.** Promter hilft dabei, Prompts für KI-Tools wie Claude oder ChatGPT nach einem festen Schema zu schreiben. Du füllst Felder wie *Rolle*, *Aufgabe* oder *Ton & Stil* aus, und Promter setzt daraus automatisch einen sauber gegliederten Prompt zusammen, den du mit einem Klick kopierst oder teilst.

👉 **App öffnen: [noerq.github.io/promter-web](https://noerq.github.io/promter-web/)**

Promter läuft im Browser auf iPhone, iPad, Mac und PC und funktioniert nach dem ersten Öffnen auch offline.

---

## Warum ein Schema?

Gute Prompts enthalten fast immer dieselben Bausteine. Fehlt einer davon, rät die KI, und das Ergebnis wird beliebiger. Promter macht diese Bausteine sichtbar, damit nichts Wichtiges vergessen wird.

## Die Kategorien

| Kategorie | Leitfrage |
|---|---|
| **Rolle** | Als wer soll die KI antworten? |
| **Aufgabe** | Was genau soll herauskommen? (am besten mit einem Verb beginnen) |
| **Kontext** | Was muss die KI wissen: Situation, Hintergrund, Zweck? |
| **Zielgruppe** | Für wen ist das Ergebnis? |
| **Ton & Stil** | Wie soll es klingen? |
| **Ausgabeformat** | Wie soll das Ergebnis aussehen: Länge, Struktur, Gliederung? |
| **Rahmenbedingungen** | Was ist Pflicht, was ist tabu? |
| *Material* (optional) | Text, E-Mail oder Notizen, mit denen die KI arbeiten soll |
| *Beispiele* (optional) | So ungefähr soll das Ergebnis aussehen |
| *Erfolgskriterien* (optional) | Woran erkennt man ein gutes Ergebnis? |

Leere Felder erscheinen nicht im Prompt. Die Kategorien lassen sich in den Einstellungen umbenennen, umsortieren und ergänzen.

## Beispiel

Aus wenigen Angaben entsteht:

```
## Rolle
Du bist eine erfahrene Verwaltungsfachkraft und formulierst professionelle E-Mails.

## Aufgabe
Beantworte die unten eingefügte E-Mail.

## Ton & Stil
freundlich, sachlich, Sie-Form

## Ausgabeformat
E-Mail mit Betreffzeile, Anrede und Grußformel; max. 150 Wörter

## Material
Guten Tag, wann kann ich mit der Bearbeitung meines Antrags rechnen? …
```

Wahlweise auch mit **XML-Tags** (`<aufgabe>…</aufgabe>`). Sie markieren Anfang und Ende jedes Abschnitts eindeutig, was sich bei längerem Material lohnt.

## Funktionen

- **Vorschläge zum Abhaken:** fertige Bausteine wie „sachlich“, „Sie-Form“ oder „max. 1 Seite“, auch mehrere auf einmal
- **Vorlagen:** typische Fälle wie *E-Mail beantworten*, *Bericht erstellen*, *Protokoll aus Notizen* oder *Text überarbeiten*, plus eigene Vorlagen. Beim Laden fragt Promter nach, bevor Eingaben überschrieben werden, und kann auch nur die leeren Felder füllen.
- **Platzhalter:** `{Empfänger}`, `{Thema}` oder `{Datum}` in Vorlagen. Beim Laden fragt Promter die Werte ab und setzt sie überall ein. `{Datum}` ist vorausgefüllt, zuletzt verwendete Werte werden vorgeschlagen.
- **Platzhalter-Übersicht:** alle Platzhalter als Schaltflächen über dem Ergebnis (auf dem iPhone unten in der Eingabe). Antippen fügt an der Cursor-Position ein, am Mac und iPad lassen sie sich auch an die gewünschte Stelle ziehen. Eigene Platzhalter lassen sich hinzufügen.
- **Prüfen lassen:** kopiert den Prompt mit der Bitte um Prüfung. In Claude eingefügt bekommst du Stärken, Lücken als Rückfragen und eine verbesserte Fassung, ohne API und ohne Zusatzkosten.
- **Hinweise:** wenn die Aufgabe fehlt, sehr knapp ist oder noch Platzhalter enthält
- **Kopieren & Teilen:** Kopieren mit einem Klick oder ⌘↩. Auf iPhone und iPad schickt „Teilen“ den Prompt direkt an die Claude- oder ChatGPT-App.
- **Verlauf:** die letzten 50 kopierten Prompts
- **Export & Import:** einzelne oder alle Vorlagen als Datei sichern, auf ein anderes Gerät übertragen oder weitergeben
- **Hell und dunkel**, passend zur Systemeinstellung

## Auf dem iPhone oder iPad installieren

1. [noerq.github.io/promter-web](https://noerq.github.io/promter-web/) in **Safari** öffnen.
2. Auf **Teilen** tippen (Quadrat mit Pfeil) → **Zum Home-Bildschirm** → **Hinzufügen**.
3. Promter über das neue Symbol starten. Die App läuft im Vollbild und auch offline.

> **Tipp:** Nutze Promter über das Home-Bildschirm-Symbol. Dort bleiben deine Vorlagen dauerhaft gespeichert. In einem normalen Safari-Tab kann iOS Daten von Webseiten nach längerer Nichtbenutzung löschen.

## Datenschutz

- Alle Eingaben, Vorlagen und der Verlauf bleiben **auf deinem Gerät** im Speicher des Browsers.
- Es gibt **keinen Server, kein Konto und kein Tracking**. Promter sendet nichts ins Internet.
- Deshalb werden die Daten auch nicht automatisch zwischen Geräten abgeglichen. Dafür gibt es **Exportieren** und **Importieren**, z. B. über iCloud Drive.

## Technik

- Reines HTML, CSS und JavaScript, ohne Frameworks und ohne Build-Schritt
- Offline-fähig über einen Service Worker, als Web-App installierbar (Web App Manifest)
- Gehostet mit GitHub Pages

Lokal ausprobieren:

```bash
python3 -m http.server 8765
```

Danach `http://localhost:8765` im Browser öffnen.
