# KI Unternehmenszentrale — Wissens- und Entwicklungsbasis

Stand: 2026-11-24. Diese Dateien enthalten ausschließlich nichtvertrauliche Architektur- und Prozessregeln. Keine Kunden-, Bank-, Personal- oder Zugangsdaten im öffentlichen Repository speichern.

## Architektur

Projektquellen (GitHub, freigegebene Dokumentation) → geprüfte Erkenntnis → wiederverwendbare Funktion → Tests → Freigabe/Deployment → dokumentierte Rückmeldung.

Bestehende Dokumentationen zuerst lesen: PROJEKTUEBERSICHT_GESAMT.md, PROJEKTSTAND_ZENTRALE.md, PROJEKTSTAND_FRIEDRICH.md, PROJEKTSTAND_JUDITH.md, PROJEKTSTAND_JUDITH_AI.md, PROJEKTSTAND_PREISKALKULATION.md.

## Strikte Regeln

- Kein projektübergreifender Zugriff auf Kunden- oder Geschäftsdaten ohne nachgewiesene Autorisierung und Mandantentrennung.
- Gemeinsame Bibliothek enthält nur generische Logik, Tests und anonymisierte Fehlerregeln.
- Vor Neubau bestehende Implementierung und offene PRs prüfen.
- Änderungen durch PR, automatisierte Tests und gesonderten Live-Nachweis.
- Keine externen kostenpflichtigen APIs, bevor technische Verbrauchssperre <= 15 EUR/Monat nachgewiesen ist. Ohne Sperre: keine kostenpflichtigen Aufrufe.
- Keine automatischen E-Mails, Zahlungen, verbindlichen Zusagen oder produktiven Datenmigrationen aus diesem Modul.

## Status

Grundstruktur im Feature-Branch; keine produktive Aktivierung. Supabase-Datenmodell und Zugriffsprüfung getrennt vornehmen.
