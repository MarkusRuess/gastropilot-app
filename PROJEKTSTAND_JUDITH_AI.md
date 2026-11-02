# PROJEKTSTAND JUDITH AI
Stand: 2026-11-02 | Status: Bestandsaufnahme, keine Anwendung geändert.

## Verbindliche Arbeitsregeln
Vor jeder Entwicklung diese Datei lesen, aktuellen GitHub- und Supabase-Stand prüfen. Nur Judith AI verändern; GastroPilot Friedrich und GastroPilot Judith niemals ohne ausdrückliche Freigabe ändern. Keine Kunden-, Auftrags- oder Zahlungsdaten löschen. Rosa Design und Mitarbeiterabläufe erhalten. Nach Änderungen testen und diese Datei mit Datum, Commit und Testergebnis aktualisieren. Status immer trennen: **Quellcode vorhanden**, **Datenbank vorhanden**, **im Betrieb berichtet**, **aktuell getestet**, **geplant**.

## 1. Architektur und Programmdateien
- Tatsächlich gefundenes Repository: MarkusRuess/gastropilot-app, Branch main (gemeinsames Repository; kein separates Judith-AI-Repository nachgewiesen).
- Judith-AI-Einstieg: `judith-ai/postfach.html` (109065 Zeichen bei Abruf); enthält HTML, CSS, JavaScript-Modul, Dashboard, Kalender-CSS, rosa Menükacheln, mobile Media Queries und Abholbutton-Logik.
- `index.html` ist die separate GastroPilot-Oberfläche und darf nicht im Rahmen von Judith AI geändert werden.
- Browser lädt `@supabase/supabase-js@2.57.0` über esm.sh; Supabase-Projekt `sjnwfwcpgwsavygewwzb`, Region eu-west-1, PostgreSQL 17; Projektstatus ACTIVE_HEALTHY.
- Im Frontend ist ein **publishable** Supabase-Schlüssel eingebunden (kein geheimer service_role-Schlüssel im geprüften Ausschnitt). Keine Schlüsselwerte in dieser Dokumentation ablegen.
- Weitere Judith-AI-Dateien, Deployment- und Edge-Function-Pfade müssen noch vollständig inventarisiert werden.

## 2. Supabase und Datenverbindungen
Direkt gelesene Tabellenübersicht (ungefähre Zeilenzahlen, Stand 2026-11-02):
| Tabelle | Zeilen | Status |
|---|---:|---|
| judith_ai_access | 4 | vorhanden |
| judith_ai_mail_messages | 123 | vorhanden |
| judith_ai_mail_drafts | 7 | vorhanden |
| judith_ai_customers | 82 | vorhanden |
| judith_ai_inquiries | 26 | vorhanden |
| judith_ai_prospects | 35 | vorhanden |
| judith_ai_attachments | 160 | vorhanden |
| judith_ai_order_recipe_links | 2 | vorhanden |
| judith_ai_presence | 4 | vorhanden |
| judith_ai_excluded_customer_emails | 9 | vorhanden |
| bank_transactions (gemeinsame GastroPilot-Tabelle) | 626 | vorhanden; Zuordnung und Anzeige gesondert testen |

Alle oben aufgeführten Tabellen haben laut Tabellenübersicht RLS aktiviert. RLS allein beweist keine korrekte Zugriffskontrolle. Für `bank_transactions` wurden Owner-gebundene SELECT/INSERT/UPDATE-Policies über `business_members` gelesen. Für Judith-AI-Tabellen lieferte die separate `pg_policies`-Abfrage keine Policies: **dringend prüfen**, ob die Tabellen über andere Wege/Funktionen erreichbar sind und wie Mitarbeiter authentifiziert und autorisiert werden. Keine Änderung ohne Planung und Freigabe.

## 3. Kundenkartei
`judith_ai_customers` mit 82 Datensätzen vorhanden. UI, Dublettenvermeidung, Bearbeiten und sichere Zuordnung nicht end-to-end getestet.

## 4. Tortenanfragen / automatische Erkennung
`judith_ai_inquiries` (26), `judith_ai_prospects` (35), `judith_ai_mail_messages` (123) und `judith_ai_attachments` (160) vorhanden. Foto-/PDF-/Nachrichten-Erkennung als bestehende Projektfunktion beschrieben; Modellaufruf, Fehlerpfade, Extraktionsqualität, Kosten und Dublettenlogik noch nicht aktuell getestet.

## 5. Aufträge / Status
Auftrags- und Statuslogik in der Judith-AI-Oberfläche angedeutet; im geprüften Ausschnitt Status `confirmed` nachgewiesen. Tatsächliche Datenquelle, weitere Statuswerte, Transaktionen und Zuordnung zu Kunden noch zu verifizieren.

## 6. Monatskalender / Abholtermine
Kalender-CSS mit Monats-/Jahresansicht und Ereignisstatus im Quellcode vorhanden. Datumswechsel, Abholzeit und Speicherung noch nicht interaktiv getestet.

## 7. Backstube / A4-Auftragsblätter
Als Projektanforderung dokumentiert; Quellcode und Drucklayout noch nicht ausreichend geprüft. Soll: ein Auftrag pro A4-Seite, alle Kundendaten, Tortenmerkmale, Dekor, Preis, Anzahlung, Restbetrag, Notizen.

## 8. Mitarbeiterzugänge
`judith_ai_access` und `judith_ai_presence` jeweils 4 Datensätze. Authentifizierung, Rollenrechte, Mandantentrennung und Zugriff von Mitarbeiterkonten noch nicht end-to-end geprüft. Insbesondere RLS-/RPC-/Edge-Function-Berechtigungen auditieren.

## 9. „Torte abgeholt“
Button-Text `✅ Torte abgeholt` und bedingte Darstellung für `status==='confirmed'` in `judith-ai/postfach.html` nachgewiesen. Tatsächliche Speicherung und konsistente Anzeige in Aufträgen, Kalender, Backstube und Kundenkartei noch zu testen.

## 10. Kundenzahlungen aus GastroPilot Judith
Die bestehende Anforderung ist **nur lesende Anzeige** von Zahlungseingängen mit Datum, Name, Betrag und Rechnungsnummer; keine Ausgänge, Kontostände, Prüf-/Verbuchen-Schaltflächen und keine automatische ETRON-Verbuchung. Nach früherem Nutzer-Praxistest wurden Juli–Oktober 2026 angezeigt; dies ist **historisch berichtet, kein aktueller Test**. `bank_transactions` vorhanden, konkrete Leseverbindung/Filter, Rechnungsnummernlogik, Aktualisierung und Schutz vor fremden Geschäftsvorfällen noch end-to-end zu prüfen. GastroPilot Judith bleibt unverändert.

## 11. KI-Erkennung und Kosten
Aktuelle API-Kosten und Modellkonfiguration nicht verifiziert. Ziel: Texte/Regeln zuerst, KI nur bei unklaren Fällen; Eingaben deduplizieren, erkannte Inhalte zwischenspeichern, kleine Modelle und Tokenlimits nutzen, Dokumente nur soweit erforderlich speichern, keine unnötigen dauerhaften Bildkopien. Löschfristen vor Implementierung datenschutzrechtlich und betrieblich prüfen; keine Daten automatisch löschen.

## 12. Mobile Ansicht und Design
Rosa Dashboard, Menükacheln, Responsive-CSS und Kalenderdarstellung im Quellcode bestätigt. Mobile Darstellung und Bedienbarkeit **nicht** auf Endgeräten getestet. Design erhalten.

## 13. Fehler, Risiken, offene Prüfungen
**Priorität hoch:** RLS-Policies der Judith-AI-Tabellen, Zugriffswege, öffentliche Repo-Sicherheit/Secret-Scan, getrennte Berechtigungen beider Betriebe, Auftrag-Dubletten und Kundenzuordnung.
**Priorität mittel:** Zahlungsanzeige und Rechnungsnummern, konsistente Abholstatus, Erkennungsfehler, E-Mail-/Anhangsverarbeitung, Drucklayout, mobile Arbeitsabläufe, Speicherkosten.
**Nicht als Fehler bestätigt:** Die genannten Punkte sind offene Prüfungen; aus dem Vorhandensein von Tabellen oder HTML folgt keine erfolgreiche End-to-End-Abnahme.

## 14. Nächste Schritte
1. Vollständigen Judith-AI-Dateibaum, JavaScript, SQL/RPC und Edge Functions read-only inventarisieren.
2. RLS, Grants, RPC-/Storage-Policies und Auth mit getrennten Testrollen prüfen.
3. Sichere Testfälle: Anfrage → Kunde → Auftrag → Kalender → Backstube → Abholung → A4.
4. Zahlungsanzeige mit Judith-only-Filter und Rechnungsnummern testen; keine Buchung verändern.
5. Dokumentenerkennung und Kosten anhand tatsächlicher Aufrufzahlen messen; Optimierungen separat freigeben.
6. Jede getestete Änderung hier mit Datum, Commit, betroffenen Dateien und Testresultat dokumentieren.

## Prüfprotokoll
2026-11-02: GitHub-Repository gefunden; `judith-ai/postfach.html` und `index.html` gelesen; Supabase-Projekt und Tabellen gelesen; RLS-Policy-Abfrage ausgeführt; keine Anwendung oder Geschäftsdaten verändert. Diese Datei ist ausschließlich Dokumentation. **Keine Live-Funktionsabnahme erfolgt.**

## 2026-11-02 – Isolierter PR: gemeinsame Zahlungskontrolle
- Branch `qa/judith-ai-payment-checkbox-only-20261102` basiert auf `main`; ausschließlich Judith-AI-Frontenddateien und diese Dokumentation. Keine Änderung an Friedrich, GastroPilot oder ETRON.
- Die Checkbox schreibt/liest über `judith-ai-payment-reviews` (JWT, aktive Judith-AI-Berechtigung, Judith-only Buchungsprüfung) in `judith_ai_payment_reviews` (RLS aktiv). Zahlungseingangsliste benötigt `id` aus bereits aktiver `judith-ai-payment-inflows` Version 4.
- Statische Prüfung und Berechtigungskonfiguration sind keine echten End-to-End-Tests. Zwei getrennte echte Mitarbeiter-Sessions stehen für die Abnahme nicht zur Verfügung; A setzt → B liest/entfernt → A liest erneut bleibt offen.
- Kein Merge oder Produktivdeploy vor erfolgreichen Tests. Keine Kunden- oder Zahlungsdaten verändert.
