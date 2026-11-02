# GastroPilot Qualitätssicherung — 2026-11-02
## Geltungsbereich
Gemeinsame GastroPilot-Zentrale, Friedrich, Judith und ausschließlich lesende Prüfung der Judith-AI-Zahlungsschnittstelle. Keine Änderung an Judith AI oder Supabase-Daten.

## Implementiert im Branch qa/automated-checks-20261102
- GitHub Actions: Pull Requests, QA-Branches und manuell; minimale Leserechte, keine Secrets, keine Datenbankverbindung.
- Node.js-Statiktests: gemeinsame Navigation/Betriebsbezug, zentrale Umsatzquelle, Bankbezug und Existenz der Judith-AI-Zahlungsansicht.
- Diese Tests sind **Smoke Checks**, keine Garantie der Mandantentrennung und kein Ersatz für E2E-Tests.
- Main und produktive Anwendungen bleiben unverändert, bis Review und grüne CI erfolgt sind.

## Bestandsaufnahme
- GitHub-Repository ist öffentlich; sensible Daten und Zugangsdaten dürfen nicht eingecheckt werden.
- Supabase-Projekt gastropilot aktiv; 62 public-Tabellen mit aktivierter RLS laut Tabellenübersicht.
- Security Advisor: 23 Tabellen mit RLS aber ohne Policies (darunter Judith-AI-Tabellen; ohne Policies grundsätzlich kein Zugriff über normale RLS-Rollen), kompromittierte Passwortprüfung deaktiviert.
- Zahlungsdatenpfad laut vorhandener Dokumentation: bank_transactions -> judith-ai-payment-inflows -> Judith-AI-Anzeige; serverseitige Autorisierung noch nicht E2E verifiziert.

## Noch offen — vor Produktionsfreigabe
1. GitHub Actions-Lauf erfolgreich abwarten und Branchschutz/erforderlichen Statuscheck aktivieren.
2. Autorisierte und unautorisierte API-/RLS-Tests mit isolierten Testkonten und synthetischen Daten; beide Betriebe wechselseitig testen.
3. Edge Function judith-ai-payment-inflows: Monatsfilter, Kundenfilter, Rechnungsnummer, Dubletten, Auth und Fehlerszenarien prüfen.
4. Secrets-Scan und Prüfung, ob Zugangsdaten in der Git-Historie vorkommen.
5. Backup-/Wiederherstellungsfähigkeit und Aufbewahrung ohne Kostenaktivierung prüfen.
6. UI-Regression auf Mobil/Desktop und Upload-/Bankimport-Tests ohne Produktivdatenänderung.
7. Sicherheitswarnungen auf tatsächliche Zugriffsrisiken prüfen, danach separat und freigegeben beheben.

## Freigaberegel
Keine produktive Übernahme allein aufgrund dieser Statiktests. Freigabe erst nach grüner CI, Review der Mandantentrennung und expliziter Genehmigung.

## Verifizierte Nachprüfung (2026-11-02)
- GitHub Actions Run 41424111246, Job 125206435684, static-checks: completed/success. Dies ist ausschließlich ein statischer Smoke-Test.
- Supabase RLS: bank_transactions SELECT/INSERT/UPDATE nur für owner-Mitgliedschaft derselben business_id; gp_ledger_monthly SELECT/INSERT/UPDATE für private.is_business_member(business_id). Vollständige Rechteprüfung und negative Laufzeittests stehen aus.
- Zahlungs-Edge-Function judith-ai-payment-inflows Version 3: verify_jwt=true; getUser(token), aktive judith_ai_access-Zuordnung, festes Judith-business_id, positive Beträge, Monatsgrenzen, Limit 2000. Keine Datenbankänderung vorgenommen.
- Befund: Rechnungsnummer nur Regex 125... aus description, keine Rechnungs-/Kundenverifikation, keine semantische Dublettenprüfung; Ergebnisse können legitime Eingänge auslassen oder falsch zuordnen. Als offene Sicherheits-/Qualitätsaufgabe behandeln.
- Backup: Supabase-Projekt aktiv, aber weder Backup-Zeitpunkt noch Wiederherstellbarkeit durch verfügbare Projektmetadaten nachgewiesen. Keine Wiederherstellung getestet.
- Supabase Security Advisor: 23 RLS-Tabellen ohne Policies und deaktivierte Leaked-Password-Prüfung. Kein automatischer produktiver Eingriff.
- Kein Beleg für vollständige Mandantentrennung, produktive Freigabe bleibt gesperrt.
