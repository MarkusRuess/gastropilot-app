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

## Zentrale Wissensdatenbank

Die geschützte Oberfläche liegt unter `unternehmenszentrale/index.html`. In Supabase hält `public.central_knowledge` Entscheidungen, Fehler, Lösungen, Prozesse und wiederverwendbare Funktionen mit Quelle und Status. `central_knowledge_history` bewahrt ältere Fassungen bei Änderungen.

- `shared`: nur geprüfte, bereinigte Einträge. Schreiben nur über eine vertrauenswürdige Serverrolle; Lesen nur mit angemeldeter Betriebsmitgliedschaft.
- `business`: Lesen nur durch Mitglieder des zugehörigen Betriebs; Entwürfe dürfen Betriebsinhaber anlegen und bearbeiten.
- `personal`: Lesen und Schreiben ausschließlich durch den angemeldeten Eigentümer. Damit können Friedrich Park und Genusswelt Baden als eigene Projekte dokumentiert werden, ohne sie einem Gastro-Betrieb zuzuordnen.
- Neue Einträge beginnen als Entwurf. Es findet keine automatische Übernahme aus Mails, Kundenakten oder Projektchats statt. Eine automatische Synchronisierung braucht getrennte Freigabe-, Datenschutz- und Kostentests.

Das Datenmodell und zwei allgemeine Regeln wurden am 24.11.2026 produktiv angelegt. Die Anzeige und das Speichern in der Oberfläche benötigen noch eine erfolgreiche Anmeldung und einen Live-Test; ein automatischer Import aus anderen Projekten ist offen.
