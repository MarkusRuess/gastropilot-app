# GastroPilot Social
Stand: 28.11.2026 · Umsetzung im offenen PR #237 / Branch feature/social-media-zentrale.

## Live umgesetzt
- Eigenständige, installierbare PWA unter https://genussweltbaden.at/social/ im isolierten Hostinger-Unterordner.
- Bestehende GastroPilot-Supabase-Identität und Betriebsmitgliedschaften; Betriebswechsel nur über zugewiesene business_members.
- Dashboard, Entwürfe, Freigabeübergänge und interner Monatskalender. Rollenprüfung und Tenant-Validierung erfolgen serverseitig über die Edge-Function.
- Anmeldung nutzt einen lokalen, schlanken Supabase-Auth-Client; Access-/Refresh-Tokens verbleiben nur im Arbeitsspeicher und werden nicht offline gespeichert.
- Live-Ursache behoben: Hostinger lieferte .mjs als text/plain aus. App-Einstieg und Auth-Modul verwenden jetzt .js; Service-Worker-Cache v4 lädt die neue Shell.
- Live geprüft: Anmeldemaske lädt wieder unter https://genussweltbaden.at/social/. Kein Passwort eingegeben; echter Auth-Login und iPhone-Abnahme sind noch offen.
- Social-CI Run #36 erfolgreich, einschließlich Auth-, Login-Sicherheits-, Mandantenwechsel-, Dashboard- und Veröffentlichungstests.
- Keine generierten Bilder. Medien-Upload bleibt gesperrt, bis Originalherkunft und Rechteprüfung verfügbar sind.

## Noch nicht produktiv
Die Kalendertermine sind interne Planung und lösen keine Veröffentlichung aus. OAuth/Provider-Schreibrechte, atomare Doppelveröffentlichungsschutz-Claims, Statusabgleich, Originalmedien-Upload, Statistiken und Google-Bewertungen sind nicht aktiviert. Es wurden keine Inhalte veröffentlicht.
Ein echter Login auf dem iPhone und Tests mit getrennten realen Mandanten sind nicht erfolgt.

## Windsor.ai / Plattformen
Windsor.ai-MCP-Konnektoren können abhängig von der bereits verbundenen Berechtigung Daten lesen und einzelne Actions bereitstellen. Die MCP-Verbindung stellt der eigenständigen Web-App jedoch keine API-Zugangsdaten oder automatisch nutzbare Publishing-API bereit. Keine neuen Kosten oder zusätzliche Credentials wurden eingerichtet.
CLI Anything liefert keine Provider-Autorisierung und wurde nicht zusätzlich installiert.

Keine bestehende GastroPilot-Anwendung wurde verändert.
