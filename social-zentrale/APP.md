# GastroPilot Social – App-Status
Stand: 28.11.2026 · PR #237 bleibt offen als Entwurf.

Die isolierte PWA ist unter https://genussweltbaden.at/social/ live. Der Unterordner wurde über den bestehenden Hostinger-Git-Eintrag deployed; das WordPress-Stammverzeichnis wurde nicht verändert. Die Supabase-Edge-Function social-zentrale ist aktiv (Version 1, JWT-Prüfung an); die drei Social-Tabellen und ihre RLS-Regeln sind im gemeinsamen Projekt vorhanden.

Der bestätigte Login-Fehler war der MIME-Typ: Hostinger lieferte .mjs als text/plain, sodass Browser das Modul nicht ausführten. App-Einstieg und Auth-Client liegen jetzt unter .js; der Service-Worker steht auf Cache v4. Der lokale Supabase-Auth-Client hält Access-/Refresh-Tokens nur im Arbeitsspeicher. Live geprüft: Login-Seite und App laden, keine Modulfehlermeldung. Kein Passwort eingegeben; realer Login und iPhone-Abnahme bleiben offen.

Entwürfe, Betriebswechsel und Freigabe-/Kalenderaktionen sind integriert. Kalendertermine sind interne Planung und lösen keine Veröffentlichung aus. Medien-Upload bleibt gesperrt, bis Originalherkunft und Rechteprüfung verfügbar sind.
