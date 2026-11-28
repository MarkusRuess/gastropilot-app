# Verifizierter Teststatus – 28.11.2026
- GitHub Actions Social-Zentrale Run #30 auf aktuellem PR-Commit: erfolgreich. Enthält Node-Tests für Publishing-Preflight, Dashboard-Mandantentrennung, Betriebswechsel und Login-Sicherheitsregressionen.
- GitHub Actions Unternehmenszentrale Registry Run #44 auf aktuellem PR-Commit: erfolgreich.
- Vorherige lokale Node-Tests: 18 bestanden, 0 fehlgeschlagen. Die neuen Login-Sicherheitschecks sind im PR-CI-Lauf enthalten.
- Live geprüft: Hostinger-Dateien im /social-Unterordner; Formular ohne GET/POST-Fallback; sichtbarer Modulfehler; Cache-Version v3; Live-HTML nach Neuladen.
- Supabase: Edge Function social-zentrale ACTIVE, verify_jwt=true; Social-Tabellen mit RLS vorhanden.
- Nicht durchgeführt: Passwort-Eingabe, echte Anmeldung am iPhone und Test mit getrennten realen Nutzerkonten.
- Offen: Provider-OAuth und Veröffentlichung, transaktionaler Doppelveröffentlichungsschutz, Originalmedienprüfung, Statistik-/Bewertungsanbindung.
- CI beweist die geprüfte Geschäftslogik und Form-Sicherheit; es ersetzt keine iPhone-/Provider-Live-Abnahme. PR #237 bleibt Entwurf.
