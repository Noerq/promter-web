'use strict';

// Gleiche Standard-Kategorien und -Vorlagen wie in der Mac-App (Sources/Promter/Defaults.swift).
// Feldnamen entsprechen dem Mac-Format, damit Export/Import zwischen beiden funktioniert.

const DEFAULT_CATEGORIES = [
  {
    id: 'rolle', title: 'Rolle', isOptional: false,
    hint: 'Als wer soll die KI antworten? z. B. „Du bist eine erfahrene Verwaltungsfachkraft.“',
    presets: [
      'Du bist eine erfahrene Verwaltungsfachkraft.',
      'Du bist eine erfahrene Assistenz der Geschäftsführung.',
      'Du bist Expertin bzw. Experte für klare Behörden- und Geschäftskorrespondenz.',
      'Du bist eine erfahrene Sachbearbeitung und schreibst gut strukturierte Berichte.',
      'Du bist ein sorgfältiges Lektorat für deutsche Geschäftstexte.',
    ],
  },
  {
    id: 'aufgabe', title: 'Aufgabe', isOptional: false,
    hint: 'Was genau soll herauskommen? Mit einem Verb beginnen: „Formuliere …“, „Fasse … zusammen“',
    presets: [
      'Formuliere eine E-Mail an {Empfänger}.',
      'Beantworte die unten eingefügte E-Mail.',
      'Erstelle einen Bericht über {Thema}.',
      'Fasse das unten eingefügte Dokument zusammen.',
      'Erstelle aus den unten eingefügten Notizen ein Protokoll.',
      'Überarbeite den unten eingefügten Text sprachlich.',
    ],
  },
  {
    id: 'kontext', title: 'Kontext', isOptional: false,
    hint: 'Was muss die KI wissen? Situation, Hintergrund, Vorgeschichte, Zweck',
    presets: [],
  },
  {
    id: 'zielgruppe', title: 'Zielgruppe', isOptional: false,
    hint: 'Für wen ist das Ergebnis? z. B. Vorgesetzte, Kolleginnen und Kollegen, Bürgerinnen und Bürger',
    presets: [
      'Vorgesetzte / Leitungsebene',
      'Kolleginnen und Kollegen',
      'Bürgerinnen und Bürger / Kundschaft',
      'Externe Geschäftspartner',
      'Fachpublikum',
      'Personen ohne Vorkenntnisse',
    ],
  },
  {
    id: 'ton', title: 'Ton & Stil', isOptional: false,
    hint: 'Wie soll es klingen? z. B. sachlich, freundlich, Sie-Form',
    presets: [
      'sachlich', 'freundlich', 'formell', 'wertschätzend', 'bestimmt, aber höflich',
      'locker', 'Sie-Form', 'Du-Form', 'einfache, verständliche Sprache',
    ],
  },
  {
    id: 'format', title: 'Ausgabeformat', isOptional: false,
    hint: 'Wie soll das Ergebnis aussehen? Länge, Struktur, Gliederung',
    presets: [
      'E-Mail mit Betreffzeile, Anrede und Grußformel', 'Fließtext', 'Stichpunkte', 'Tabelle',
      'Mit Zwischenüberschriften gegliedert', 'max. 100 Wörter', 'max. 200 Wörter', 'max. 1 Seite',
    ],
  },
  {
    id: 'rahmen', title: 'Rahmenbedingungen', isOptional: false,
    hint: 'Was ist Pflicht, was ist tabu? z. B. „keine Floskeln“, „nichts erfinden“',
    presets: [
      'Keine Floskeln.',
      'Nichts erfinden – nur Informationen aus dem Material verwenden.',
      'Offene Punkte oder Unklarheiten kennzeichnen.',
      'Keine Zusagen machen, die nicht im Kontext stehen.',
      'Gendergerechte Sprache verwenden.',
      'Keine Abkürzungen verwenden.',
    ],
  },
  {
    id: 'material', title: 'Material', isOptional: true,
    hint: 'Text, E-Mail, Notizen oder Daten, mit denen die KI arbeiten soll (einfach hineinkopieren)',
    presets: [],
  },
  {
    id: 'beispiele', title: 'Beispiele', isOptional: true,
    hint: 'So ungefähr soll das Ergebnis aussehen (z. B. eine frühere E-Mail, die gut ankam)',
    presets: [],
  },
  {
    id: 'kriterien', title: 'Erfolgskriterien', isOptional: true,
    hint: 'Woran erkennst du ein gutes Ergebnis? z. B. „Leser weiß danach, was bis wann zu tun ist“',
    presets: [
      'Die Lesenden wissen danach, was bis wann zu tun ist.',
      'Alle Fragen aus dem Material sind beantwortet.',
      'In unter einer Minute lesbar.',
    ],
  },
];

const DEFAULT_TEMPLATES = [
  {
    id: '6f2b1c3a-8d4e-4a1b-9c2d-1e5f7a9b0c01', name: 'E-Mail beantworten', askQuestions: false,
    values: {
      rolle: 'Du bist eine erfahrene Verwaltungsfachkraft und formulierst professionelle E-Mails.',
      aufgabe: 'Beantworte die unten eingefügte E-Mail.',
      ton: 'freundlich, sachlich, Sie-Form',
      format: 'E-Mail mit Betreffzeile, Anrede und Grußformel; max. 150 Wörter',
      rahmen: 'Keine Floskeln. Keine Zusagen machen, die nicht im Kontext stehen.',
    },
  },
  {
    id: '6f2b1c3a-8d4e-4a1b-9c2d-1e5f7a9b0c02', name: 'E-Mail verfassen', askQuestions: false,
    values: {
      rolle: 'Du bist eine erfahrene Verwaltungsfachkraft und formulierst professionelle E-Mails.',
      aufgabe: 'Formuliere eine E-Mail an {Empfänger} zum Thema {Thema}.',
      ton: 'freundlich, sachlich, Sie-Form',
      format: 'E-Mail mit Betreffzeile, Anrede und Grußformel; max. 150 Wörter',
      rahmen: 'Keine Floskeln. Klar benennen, was ich vom Empfänger brauche und bis wann.',
    },
  },
  {
    id: '6f2b1c3a-8d4e-4a1b-9c2d-1e5f7a9b0c03', name: 'Bericht erstellen', askQuestions: true,
    values: {
      rolle: 'Du bist eine erfahrene Sachbearbeitung und schreibst klare, gut strukturierte Berichte.',
      aufgabe: 'Erstelle einen Bericht über {Thema} für den Zeitraum {Zeitraum}.',
      zielgruppe: 'Vorgesetzte / Leitungsebene',
      ton: 'sachlich, präzise, neutral',
      format: 'Gliederung mit Zwischenüberschriften: Anlass, Sachstand, Bewertung, Empfehlung; max. 1 Seite',
      rahmen: 'Nichts erfinden – nur Informationen aus dem Material verwenden. Offene Punkte kennzeichnen.',
    },
  },
  {
    id: '6f2b1c3a-8d4e-4a1b-9c2d-1e5f7a9b0c04', name: 'Protokoll aus Notizen', askQuestions: false,
    values: {
      rolle: 'Du bist eine erfahrene Assistenz und erstellst präzise Ergebnisprotokolle.',
      aufgabe: 'Erstelle aus den unten eingefügten Stichpunkten ein Ergebnisprotokoll.',
      ton: 'sachlich, knapp',
      format: 'Kopfdaten (Datum, Teilnehmende, Thema), Ergebnisse je Tagesordnungspunkt, danach Aufgabenliste als Tabelle (Was / Wer / Bis wann)',
      rahmen: 'Nichts erfinden. Unklare Stellen mit [?] markieren.',
    },
  },
  {
    id: '6f2b1c3a-8d4e-4a1b-9c2d-1e5f7a9b0c05', name: 'Dokument zusammenfassen', askQuestions: false,
    values: {
      aufgabe: 'Fasse das unten eingefügte Dokument zusammen.',
      ton: 'sachlich, verständlich',
      format: '5–7 Stichpunkte mit den wichtigsten Aussagen, danach offene Fragen und To-dos',
      rahmen: 'Keine eigenen Bewertungen, nur Inhalte aus dem Dokument.',
    },
  },
  {
    id: '6f2b1c3a-8d4e-4a1b-9c2d-1e5f7a9b0c06', name: 'Text überarbeiten', askQuestions: false,
    values: {
      rolle: 'Du bist ein sorgfältiges Lektorat für deutsche Geschäftstexte.',
      aufgabe: 'Überarbeite den unten eingefügten Text sprachlich: klarer, kürzer, fehlerfrei.',
      rahmen: 'Inhalt nicht verändern. Änderungen am Ende kurz in Stichpunkten auflisten.',
    },
  },
];

// Startliste der Platzhalter-Übersicht (lässt sich in der App bearbeiten)
const DEFAULT_PLACEHOLDERS = ['Empfänger', 'Absender', 'Thema', 'Datum', 'Zeitraum', 'Vorgang', 'Frist'];
