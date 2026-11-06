# GastroPilot Mutter – Automatisierungsplan

Stand: 2026-11-06. Status: Konzept zur Prüfung, **keine produktive Automatisierung implementiert**.

## Ziel
Ein zentraler, nachvollziehbarer Ablauf für GastroPilot Zentrale, Friedrich, Judith und Judith AI. Bestehendes Repository, bestehende Supabase-Instanz, bestehende Live-Links und Berechtigungen bleiben erhalten.

## Ablauf
Ereignis oder täglicher Zeitplan → Bestandsaufnahme (GitHub Actions/PRs, Supabase-Status, Projektstände) → Fehler-/Aufgabenliste mit Fingerprint → Priorisierung → sicherer Änderungsvorschlag im Branch → CI-Tests → Prüfung → kontrollierter Merge/Deployment → Live-Nachweis → Aktualisierung der Projektstände.

## Stufen
1. **Beobachten:** täglicher kompakter Bericht mit neuen Fehlern, blockierten Aufgaben, offenen PRs, Tests, Zuständigkeit und Status. Vorhandene Sicherheitsprüfung nicht doppelt ausführen.
2. **Vorbereiten:** eindeutige Issues mit Dublettenprüfung; reproduzierbare Fehler mit Code-Referenz, Test und PR-Vorschlag. Keine automatische Freigabe.
3. **Sicher korrigieren:** nur klar begrenzte, rücknehmbare Änderungen in separatem Branch; CI muss erfolgreich sein. Kein direkter Commit auf main.
4. **Veröffentlichen:** erst nach nachgewiesenen Tests, geeigneter Freigabe und Rollback-Möglichkeit; bestehender produktiver Link bleibt gleich. Authentifizierte Live-Prüfung nur mit vorhandener berechtigter Sitzung.

## Schutzregeln
- Keine automatischen Zahlungen, Kundennachrichten, Löschungen, Preisänderungen, Datenmigrationen oder Berechtigungs-/RLS-Änderungen.
- Judith und Friedrich immer per serverseitig autorisierter business_id trennen; Judith AI erhält keine Finanzdaten außer ausdrücklich freigegebenen Kundenzahlungsinformationen.
- Keine personenbezogenen Betriebsdaten, Geheimnisse, Bankbelege oder Tokens in Issues, Logs und Berichten.
- Originalbelege nur entsprechend gesetzlichen Pflichten speichern; KI-Aufrufe durch Wiederverwendung erkannter Daten minimieren.
- Keine neuen Benutzer, Apps, URLs, Datenbanken oder kostenpflichtigen Dienste ohne Freigabe.
- Unbestätigte Ergebnisse ausdrücklich als ungeprüft markieren; niemals aus CI allein auf Live-Funktion schließen.

## Erster technischer Arbeitsschritt
Bestehende Workflows auf main und offenen PRs inventarisieren, Trigger und Rechte prüfen, sichere read-only Statusabfrage als CI-Job konzipieren und nur in einem separaten PR zur Prüfung vorlegen. Danach gezielte Regressionstests für Upload, Umsatzquellen, Personalquote und Judith-AI-Zahlungsschnittstelle priorisieren.

## Definition von fertig
Nachweisbarer GitHub-Actions-Lauf, dokumentierte Rechte und Trigger, Dublettenfreiheit, reproduzierbare Tests, sicherer Rollback, kontrollierte Live-Prüfung und aktualisierte Projektstanddateien. Kein Schritt wird ohne Nachweis als abgeschlossen bezeichnet.
