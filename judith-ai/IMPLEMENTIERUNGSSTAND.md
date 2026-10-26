# Judith AI · Implementierungsstand 26.10.2026

## Stand
- Eigenständige, responsive HTML-Oberfläche: judith-ai/index.html (Entwicklungsbranch).
- Kein Zugriff auf produktive Kundendaten, keine Live-E-Mail-Anbindung, kein aktiver Login.
- GastroPilot main unverändert.

## Sicherheit
- Repository ist derzeit öffentlich und hostet GastroPilot über GitHub Pages.
- Vor Umstellung auf privat: Pages-Tarif/Erreichbarkeit klären.
- Judith AI nicht mit echten Daten über eine statische öffentliche Demo betreiben.
- Mail-Passwörter ausschließlich in geschützten Backend-Secrets, niemals in GitHub oder im Browser.
- Serverseitige Freigabe vor SMTP-Versand, mit Audit-Protokoll.
- Persönliche Verantwortlichkeit bei Freigaben; ein gemeinsames Passwort ist dafür nicht ausreichend.

## Backend-Bausteine – vorgesehen, noch nicht ausgeführt
Private Datenbereiche: customers, mail_threads, mail_messages, ai_drafts, mail_attachments, audit_events, cost_usage_daily, app_settings.
Datenbankzugriff ausschließlich durch autorisierten Backend-Dienst, mit strikt auf Judith begrenzter Datenfreigabe.
Mail-Import idempotent anhand Provider-UID und Message-ID.
Mail-Senden nur für freigegebene Entwürfe, eindeutiger Versandauftrag, Retry- und Fehlerstatus.
Anfänglich KI-Generierung und SMTP-Versand deaktiviert; Aktivierung nach Test.
30 EUR monatliches Zusatzkostenbudget als Schutzlimit vorsehen; noch nicht aktiv.

## Nächster technischer Meilenstein
1. GitHub Pages/Repository-Privatsphäre ohne Ausfall absichern.
2. Private Tabellen und Auth konfigurieren; Tests für unberechtigte Zugriffe.
3. Backend-Mailverbindung easyname IMAP/SMTP mit Testmail.
4. KI-Entwurf, manuelle Freigabe, SMTP-Testantwort.
5. Nutzungs- und Budgetlimit testen.
