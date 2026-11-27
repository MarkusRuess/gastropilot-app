# Gemeinsames Wissen für neue Projektchats

Stand: 27.11.2026. Dies ist ein **lesbarer Auszug** aus der geschützten Zentralen Wissensdatenbank, kein zweites führendes Register und keine automatische Synchronisierung. Bei Widersprüchen gilt der aktuellere, belegte Eintrag im [Space](https://chatgpt.com/space/page_80fd71ad87b48191b12685eb158edf16) beziehungsweise in `public.central_knowledge`. Wenn der Space im neuen Chat nicht erreichbar ist, diesen Auszug nutzen und die Zugriffslücke nennen. Keine Kunden-, Personal-, Bank-, Betriebszahlen- oder Zugangsdaten hier speichern.

## Verbindliche allgemeine Arbeitsregeln

| Regel | Projekt / Geltungsbereich | Quelle und Datum | Nachweisstatus |
|---|---|---|---|
| Judith und Friedrich bei Daten und Berechtigungen strikt trennen; nur bereinigte technische Regeln teilen. Für neue Kunden dieselbe Trennung verwenden. | Alle Projekte | Zentrale Wissensdatenbank, Geschäftsregel GR-01, 25.11.2026 | FREIGEGEBEN; getrennte echte Konten für Live-Abnahme noch offen |
| Bestehende produktive Links, Zugänge und Design erhalten. | Websites | Geschäftsregel GR-02, 25.11.2026 | FREIGEGEBEN als Nutzervorgabe; je Website prüfen |
| Bei technischen Website-Reparaturen keine Preise, Produkte, Bestellungen oder Zahlungen ändern; nur Originalfotos verwenden. | Websites | Geschäftsregel GR-03, 25.11.2026 | FREIGEGEBEN als Nutzervorgabe |
| Fehlende Preise als offen markieren statt erfinden. | Angebote und Verkauf | Geschäftsregel GR-04, 25.11.2026 | FREIGEGEBEN als Nutzervorgabe |
| Keine Budgeterhöhung und keine neuen kostenpflichtigen Dienste ohne Freigabe. | Alle Projekte | Geschäftsregel GR-05, 25.11.2026 | FREIGEGEBEN als Nutzervorgabe |

## Bereinigte, geprüfte Einträge aus der Datenbank

| Erkenntnis | Projekt | Quelle und Datum | Nachweisstatus / Grenze |
|---|---|---|---|
| **Betriebszugriff über Mitgliedschaft:** Betriebsbezogene Daten folgen der Mitgliedschaft in `business_members` über `private.is_business_member(business_id)`. | GastroPilot | Datenbankschema und RLS, 24.11.2026 | Quelle geprüft; Trennung mit zwei echten Betriebskonten noch offen |
| **Wissen erst nach Prüfung freigeben:** Allgemeines Wissen erst nach Bereinigung und Prüfung freigeben; personenbezogene Daten, Betriebszahlen und Geheimnisse bleiben im jeweiligen Bereich. | Unternehmenszentrale | Datenbankschema und Richtlinie, 24.11.2026 | Quelle geprüft |
| **Geldbeträge mit Dezimalkomma einlesen:** Die Funktion `number` liest `1.250,50 €` als `1250.5`. | GastroPilot | `unternehmenszentrale/learning.mjs`, `learning.test.mjs`, PR #211, 24.11.2026 | Synthetischer Funktionstest; keine allgemeine Live-Freigabe für alle Belege |
| **Einheiten nur innerhalb derselben Dimension umrechnen:** `unitPrice` rechnet kg zu g und weist kg zu l zurück. | GastroPilot | `unternehmenszentrale/learning.mjs`, `learning.test.mjs`, PR #211, 24.11.2026 | Synthetischer Funktionstest; keine Live-Abnahme aller Gebinde |
| **Zitierte E-Mail-Teile vom aktuellen Text trennen:** `currentMail` trennt im geprüften Beispiel aktuellen Text vom zitierten Mailteil. | GastroPilot | `unternehmenszentrale/learning.mjs`, `learning.test.mjs`, PR #211, 24.11.2026 | Synthetischer Funktionstest; kein Live-Versandnachweis |
| **Kostenpflichtige KI nur mit harter Vorabprüfung:** Kostenpflichtige KI nur nach verlässlichem Maximalpreis und atomarer monatlicher Reservierung vor dem Anbieteraufruf. Bis dahin blockieren. | Unternehmenszentrale | PR #233 und Supabase-Budgetpolicy, 27.11.2026 | Quelle und aktiver Code geprüft; sieben Stellen gesperrt, bezahlte Freigabe offen |

## Relevante offene Fehler

- Mehrseiten-Foto-Uploads und Wiederanlauf: wiederkehrend gemeldet; dauerhafte Live-Lösung nicht nachgewiesen. Quelle: Zentrale Wissensdatenbank, Fehler F-05, 25.11.2026.
- KI-Kostenkontrolle: sieben direkte Stellen wurden über den Guard gesperrt; belastbare Preisobergrenze und kostenpflichtige Freischaltung fehlen. Quelle: [Issue #232](https://github.com/MarkusRuess/gastropilot-app/issues/232), 27.11.2026.
- Betriebsisolation: ein angemeldetes Konto gehört derzeit zu Judith und Friedrich. Ein Live-Test mit zwei getrennten Konten steht aus. Quelle: [Issue #232](https://github.com/MarkusRuess/gastropilot-app/issues/232), 27.11.2026.

## Nutzung im neuen Chat

1. Vor einem Vorschlag bestehende Regeln, Module und offene Fehler mit Quelle und Datum prüfen.
2. Nur allgemein freigegebene Regeln auf andere Kunden übertragen; synthetische Tests als solche benennen.
3. Projektbezogene Daten und Zugriffe ausschließlich im jeweiligen Kundenprojekt bearbeiten.
4. Neue Erkenntnisse mit Projekt, Quelle, Datum, Nachweisstatus und Datenklassifikation in der geschützten Wissensdatenbank dokumentieren. Dieser GitHub-Auszug ist nur eine Lesehilfe und ersetzt keine Freigabe.
