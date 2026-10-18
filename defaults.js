'use strict';

// Automatisch erzeugt aus Tools/defaults.json – bitte dort ändern und
// `python3 Tools/gen_defaults.py` ausführen. Gleiche Inhalte wie in der Mac-App,
// Feldnamen im Mac-Format, damit Export/Import zwischen beiden funktioniert.

const DEFAULT_CATEGORIES = [
  {
    "id": "rolle",
    "title": "Rolle",
    "isOptional": false,
    "hint": "Als wer soll die KI antworten? z. B. „Du bist eine erfahrene Verwaltungsfachkraft.“",
    "presets": [
      "Du bist eine erfahrene Verwaltungsfachkraft.",
      "Du bist eine erfahrene Assistenz der Geschäftsführung.",
      "Du bist Expertin bzw. Experte für klare Behörden- und Geschäftskorrespondenz.",
      "Du bist eine erfahrene Sachbearbeitung und schreibst gut strukturierte Berichte.",
      "Du bist ein sorgfältiges Lektorat für deutsche Geschäftstexte.",
      "Du schreibst im Namen von {Absender}."
    ]
  },
  {
    "id": "aufgabe",
    "title": "Aufgabe",
    "isOptional": false,
    "hint": "Was genau soll herauskommen? Mit einem Verb beginnen: „Formuliere …“, „Fasse … zusammen“",
    "presets": [
      "Formuliere eine E-Mail an {Empfänger} zum Thema {Thema}.",
      "Beantworte die unten eingefügte E-Mail von {Empfänger}.",
      "Formuliere eine freundliche Erinnerung an {Empfänger} zur Frist am {Frist}.",
      "Formuliere eine Einladung an {Empfänger} zum Termin am {Termin}.",
      "Erstelle einen Bericht über {Thema} für den Zeitraum {Zeitraum}.",
      "Erstelle aus den unten eingefügten Notizen ein Protokoll der Besprechung vom {Datum}.",
      "Fasse das unten eingefügte Dokument zusammen.",
      "Überarbeite den unten eingefügten Text sprachlich."
    ]
  },
  {
    "id": "kontext",
    "title": "Kontext",
    "isOptional": false,
    "hint": "Was muss die KI wissen? Situation, Hintergrund, Vorgeschichte, Zweck",
    "presets": [
      "Es geht um den Vorgang {Vorgang} (Aktenzeichen {Aktenzeichen}).",
      "Die Frist endet am {Frist}.",
      "Das Gespräch mit {Empfänger} fand am {Datum} statt.",
      "Ich schreibe im Namen von {Absender}.",
      "Es ist die erste Kontaktaufnahme zu diesem Thema.",
      "Es gab bereits mehrere Nachfragen, die Antwort sollte das Thema abschließen."
    ]
  },
  {
    "id": "zielgruppe",
    "title": "Zielgruppe",
    "isOptional": false,
    "hint": "Für wen ist das Ergebnis? z. B. Vorgesetzte, Kolleginnen und Kollegen, Bürgerinnen und Bürger",
    "presets": [
      "Vorgesetzte / Leitungsebene",
      "Kolleginnen und Kollegen",
      "Bürgerinnen und Bürger / Kundschaft",
      "Externe Geschäftspartner",
      "Fachpublikum",
      "Personen ohne Vorkenntnisse"
    ]
  },
  {
    "id": "ton",
    "title": "Ton & Stil",
    "isOptional": false,
    "hint": "Wie soll es klingen? z. B. sachlich, freundlich, Sie-Form",
    "presets": [
      "sachlich",
      "freundlich",
      "formell",
      "wertschätzend",
      "bestimmt, aber höflich",
      "locker",
      "Sie-Form",
      "Du-Form",
      "einfache, verständliche Sprache"
    ]
  },
  {
    "id": "format",
    "title": "Ausgabeformat",
    "isOptional": false,
    "hint": "Wie soll das Ergebnis aussehen? Länge, Struktur, Gliederung",
    "presets": [
      "E-Mail mit Betreffzeile, Anrede und Grußformel",
      "Grußformel mit {Absender}",
      "Betreffzeile mit Aktenzeichen {Aktenzeichen}",
      "Fließtext",
      "Stichpunkte",
      "Tabelle",
      "Mit Zwischenüberschriften gegliedert",
      "max. 100 Wörter",
      "max. 200 Wörter",
      "max. 1 Seite"
    ]
  },
  {
    "id": "rahmen",
    "title": "Rahmenbedingungen",
    "isOptional": false,
    "hint": "Was ist Pflicht, was ist tabu? z. B. „keine Floskeln“, „nichts erfinden“",
    "presets": [
      "Keine Floskeln.",
      "Nichts erfinden – nur Informationen aus dem Material verwenden.",
      "Offene Punkte oder Unklarheiten kennzeichnen.",
      "Keine Zusagen machen, die nicht im Kontext stehen.",
      "Die Frist {Frist} deutlich nennen.",
      "Fehlende Angaben als [Platzhalter] in eckigen Klammern markieren.",
      "Gendergerechte Sprache verwenden.",
      "Keine Abkürzungen verwenden."
    ]
  },
  {
    "id": "material",
    "title": "Material",
    "isOptional": true,
    "hint": "Text, E-Mail, Notizen oder Daten, mit denen die KI arbeiten soll (einfach hineinkopieren)",
    "presets": []
  },
  {
    "id": "beispiele",
    "title": "Beispiele",
    "isOptional": true,
    "hint": "So ungefähr soll das Ergebnis aussehen (z. B. eine frühere E-Mail, die gut ankam)",
    "presets": []
  },
  {
    "id": "kriterien",
    "title": "Erfolgskriterien",
    "isOptional": true,
    "hint": "Woran erkennst du ein gutes Ergebnis? z. B. „Leser weiß danach, was bis wann zu tun ist“",
    "presets": [
      "{Empfänger} weiß danach, was bis {Frist} zu tun ist.",
      "Alle Fragen aus dem Material sind beantwortet.",
      "In unter einer Minute lesbar.",
      "Kann ohne Änderungen verschickt werden."
    ]
  }
];

const DEFAULT_TEMPLATES = [
  {
    "id": "6F2B1C3A-8D4E-4A1B-9C2D-1E5F7A9B0C01",
    "name": "E-Mail beantworten",
    "askQuestions": false,
    "values": {
      "rolle": "Du bist eine erfahrene Verwaltungsfachkraft und schreibst im Namen von {Absender}.",
      "aufgabe": "Beantworte die unten eingefügte E-Mail von {Empfänger}.",
      "ton": "freundlich, sachlich, Sie-Form",
      "format": "E-Mail mit Betreffzeile, Anrede und Grußformel mit {Absender}; max. 150 Wörter",
      "rahmen": "Keine Floskeln. Keine Zusagen machen, die nicht im Kontext stehen."
    }
  },
  {
    "id": "6F2B1C3A-8D4E-4A1B-9C2D-1E5F7A9B0C02",
    "name": "E-Mail verfassen",
    "askQuestions": false,
    "values": {
      "rolle": "Du bist eine erfahrene Verwaltungsfachkraft und schreibst im Namen von {Absender}.",
      "aufgabe": "Formuliere eine E-Mail an {Empfänger} zum Thema {Thema}.",
      "ton": "freundlich, sachlich, Sie-Form",
      "format": "E-Mail mit Betreffzeile, Anrede und Grußformel mit {Absender}; max. 150 Wörter",
      "rahmen": "Keine Floskeln. Klar benennen, was ich von {Empfänger} brauche und bis wann ({Frist})."
    }
  },
  {
    "id": "6F2B1C3A-8D4E-4A1B-9C2D-1E5F7A9B0C07",
    "name": "Fristerinnerung",
    "askQuestions": false,
    "values": {
      "rolle": "Du bist eine erfahrene Verwaltungsfachkraft und schreibst im Namen von {Absender}.",
      "aufgabe": "Formuliere eine freundliche Erinnerung an {Empfänger}, dass für den Vorgang {Vorgang} noch Unterlagen fehlen und die Frist am {Frist} endet.",
      "kontext": "Aktenzeichen: {Aktenzeichen}",
      "ton": "freundlich, bestimmt, Sie-Form",
      "format": "E-Mail mit Betreffzeile (mit Aktenzeichen {Aktenzeichen}), Anrede und Grußformel mit {Absender}; max. 120 Wörter",
      "rahmen": "Keine Vorwürfe. Klar sagen, was bis wann fehlt. Fehlende Unterlagen als [Unterlage] markieren, wenn sie nicht im Kontext stehen."
    }
  },
  {
    "id": "6F2B1C3A-8D4E-4A1B-9C2D-1E5F7A9B0C08",
    "name": "Zwischenbescheid / Sachstand",
    "askQuestions": false,
    "values": {
      "rolle": "Du bist eine erfahrene Sachbearbeitung und schreibst im Namen von {Absender}.",
      "aufgabe": "Formuliere eine Zwischennachricht an {Empfänger} zum Vorgang {Vorgang}: Die Bearbeitung läuft und ist voraussichtlich bis {Frist} abgeschlossen.",
      "kontext": "Aktenzeichen: {Aktenzeichen}",
      "zielgruppe": "Bürgerinnen und Bürger / Kundschaft",
      "ton": "freundlich, verständlich, Sie-Form",
      "format": "E-Mail mit Betreffzeile, Anrede und Grußformel mit {Absender}; max. 100 Wörter",
      "rahmen": "Keine Zusagen machen, die nicht im Kontext stehen. Keine Fachbegriffe ohne Erklärung."
    }
  },
  {
    "id": "6F2B1C3A-8D4E-4A1B-9C2D-1E5F7A9B0C09",
    "name": "Einladung zum Termin",
    "askQuestions": false,
    "values": {
      "rolle": "Du bist eine erfahrene Assistenz und schreibst im Namen von {Absender}.",
      "aufgabe": "Formuliere eine Einladung an {Empfänger} zum Termin „{Thema}“ am {Termin}.",
      "ton": "freundlich, sachlich, Sie-Form",
      "format": "E-Mail mit Betreffzeile; Datum, Uhrzeit und Ort deutlich hervorgehoben; Bitte um Rückmeldung bis {Frist}; Grußformel mit {Absender}",
      "rahmen": "Ort und Tagesordnung nicht erfinden – fehlen sie, als [Ort] bzw. [Tagesordnung] markieren."
    }
  },
  {
    "id": "6F2B1C3A-8D4E-4A1B-9C2D-1E5F7A9B0C10",
    "name": "Freundliche Absage",
    "askQuestions": false,
    "values": {
      "rolle": "Du bist eine erfahrene Verwaltungsfachkraft und schreibst im Namen von {Absender}.",
      "aufgabe": "Formuliere eine freundliche Absage an {Empfänger} zu {Thema}.",
      "ton": "wertschätzend, klar, Sie-Form",
      "format": "E-Mail mit Betreffzeile, Anrede und Grußformel mit {Absender}; max. 120 Wörter",
      "rahmen": "Keine Gründe nennen, die nicht im Kontext stehen. Keine Floskeln."
    }
  },
  {
    "id": "6F2B1C3A-8D4E-4A1B-9C2D-1E5F7A9B0C03",
    "name": "Bericht erstellen",
    "askQuestions": true,
    "values": {
      "rolle": "Du bist eine erfahrene Sachbearbeitung und schreibst klare, gut strukturierte Berichte.",
      "aufgabe": "Erstelle einen Bericht über {Thema} für den Zeitraum {Zeitraum}.",
      "zielgruppe": "Vorgesetzte / Leitungsebene",
      "ton": "sachlich, präzise, neutral",
      "format": "Gliederung mit Zwischenüberschriften: Anlass, Sachstand, Bewertung, Empfehlung; max. 1 Seite",
      "rahmen": "Nichts erfinden – nur Informationen aus dem Material verwenden. Offene Punkte kennzeichnen."
    }
  },
  {
    "id": "6F2B1C3A-8D4E-4A1B-9C2D-1E5F7A9B0C04",
    "name": "Protokoll aus Notizen",
    "askQuestions": false,
    "values": {
      "rolle": "Du bist eine erfahrene Assistenz und erstellst präzise Ergebnisprotokolle.",
      "aufgabe": "Erstelle aus den unten eingefügten Stichpunkten ein Ergebnisprotokoll der Besprechung „{Thema}“ vom {Datum}.",
      "ton": "sachlich, knapp",
      "format": "Kopfdaten (Datum, Teilnehmende, Thema), Ergebnisse je Tagesordnungspunkt, danach Aufgabenliste als Tabelle (Was / Wer / Bis wann)",
      "rahmen": "Nichts erfinden. Unklare Stellen mit [?] markieren."
    }
  },
  {
    "id": "6F2B1C3A-8D4E-4A1B-9C2D-1E5F7A9B0C11",
    "name": "Gesprächsvermerk",
    "askQuestions": false,
    "values": {
      "rolle": "Du bist eine erfahrene Sachbearbeitung und dokumentierst Gespräche sachlich und vollständig.",
      "aufgabe": "Erstelle aus den unten eingefügten Notizen einen Gesprächsvermerk über das Gespräch mit {Empfänger} am {Datum} zum Vorgang {Vorgang}.",
      "kontext": "Aktenzeichen: {Aktenzeichen}",
      "ton": "sachlich, neutral",
      "format": "Kopf (Datum, Gesprächspartner, Vorgang, Aktenzeichen), Inhalt in Stichpunkten, vereinbarte nächste Schritte mit Frist",
      "rahmen": "Nur Inhalte aus den Notizen verwenden. Wörtliche Zusagen kennzeichnen."
    }
  },
  {
    "id": "6F2B1C3A-8D4E-4A1B-9C2D-1E5F7A9B0C12",
    "name": "Abwesenheitsnotiz",
    "askQuestions": false,
    "values": {
      "aufgabe": "Formuliere eine automatische Abwesenheitsnotiz für den Zeitraum {Zeitraum}. Vertretung: {Vertretung}.",
      "ton": "freundlich, knapp, Sie-Form",
      "format": "Kurzer Text für die automatische Antwort, max. 60 Wörter, mit Grußformel {Absender}",
      "rahmen": "Keinen Urlaubsgrund nennen. Kontaktdaten der Vertretung nur, wenn sie im Kontext stehen."
    }
  },
  {
    "id": "6F2B1C3A-8D4E-4A1B-9C2D-1E5F7A9B0C05",
    "name": "Dokument zusammenfassen",
    "askQuestions": false,
    "values": {
      "aufgabe": "Fasse das unten eingefügte Dokument zusammen.",
      "ton": "sachlich, verständlich",
      "format": "5–7 Stichpunkte mit den wichtigsten Aussagen, danach offene Fragen und To-dos",
      "rahmen": "Keine eigenen Bewertungen, nur Inhalte aus dem Dokument. Fristen und Termine besonders hervorheben."
    }
  },
  {
    "id": "6F2B1C3A-8D4E-4A1B-9C2D-1E5F7A9B0C06",
    "name": "Text überarbeiten",
    "askQuestions": false,
    "values": {
      "rolle": "Du bist ein sorgfältiges Lektorat für deutsche Geschäftstexte.",
      "aufgabe": "Überarbeite den unten eingefügten Text sprachlich: klarer, kürzer, fehlerfrei.",
      "rahmen": "Inhalt nicht verändern. Änderungen am Ende kurz in Stichpunkten auflisten."
    }
  }
];

// Stand der mitgelieferten Vorschläge und früher mitgelieferte, inzwischen veraltete Vorschläge
const DEFAULT_PRESETS_VERSION = 2;
const RETIRED_PRESETS = ["Formuliere eine E-Mail an …", "Erstelle einen Bericht über …", "Formuliere eine E-Mail an {Empfänger}.", "Erstelle einen Bericht über {Thema}.", "Beantworte die unten eingefügte E-Mail.", "Erstelle aus den unten eingefügten Notizen ein Protokoll.", "Die Lesenden wissen danach, was bis wann zu tun ist."];

// Startliste der Platzhalter-Übersicht (lässt sich in der App bearbeiten)
const DEFAULT_PLACEHOLDERS = ["Empfänger", "Absender", "Thema", "Datum", "Zeitraum", "Vorgang", "Aktenzeichen", "Frist", "Termin"];
