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


## 2026-11-02 – Wiederherstellung Zahlungseingänge nach PR #53
- Live-Fehlerbild: Liste meldete „Zahlungseingänge derzeit nicht verfügbar“, obwohl der Zahlungsabruf selbst HTTP 200 lieferte.
- Ursache im Frontend behoben: Der zusätzliche Review-Abruf verwendete den globalen `jdHeaders()`-Helper statt der bereits im Zahlungsabruf bestätigten Supabase-Sitzung. Review-Lese- und Schreibaufrufe verwenden nun dieselbe frisch gelesene Sitzung wie der Zahlungsabruf, einschließlich `Authorization` und Publishable API-Key.
- Änderung ausschließlich `judith-ai/postfach.html` in `main`, Commit `f107d5dd75caf21f34a116d7b77950db3ca24fa6`. Keine Datenbank-, Zahlungs-, Friedrich- oder ETRON-Änderungen.
- Noch erforderlich: Browser-Neuladen und Live-Bestätigung, dass die Zahlungsliste wieder lädt; danach Checkbox-Speicherung praktisch testen.


## 2026-11-02 – Isolierte Dashboard-Navigation (PR #54)
- Ausschließlich `judith-ai/postfach.html`: Rosa Dashboard bleibt sichtbar; Funktionsbereiche werden unterhalb der Kacheln angezeigt, jeweils nur ein Bereich; erneutes Anklicken schließt den Bereich. Weitere Funktionen standardmäßig eingeklappt; kein Zurück-Button.
- Aktuelle produktive Zahlungsabruf-/Kontrollhäkchen-Implementierung aus `main` unverändert übernommen; andere GastroPilot-Anwendungen nicht verändert.
- Kalender: Vor dem Setzen von „Torte abgeholt“ ist eine ausdrückliche Bestätigung erforderlich. **Rückgängig-Funktion noch offen:** Aktuelle Supabase-Edge-Function `judith-ai-inbox` erlaubt nur `confirm`, `pickup`, `delete_images`, `edit`, kein Undo. Eine Rücknahme darf nicht nur im Browser simuliert werden.
- Prüfung: Geänderte Dateien in PR #54 kontrolliert; Syntax des separaten Zahlungsmoduls geprüft; authentifizierter Live-Test und CI-Test nicht bestätigt. Produktivstatus erst nach nachgewiesenem Merge/Deployment.


## 2026-11-02 – Gemeinsamer Preisberater
Neue ausdrücklich beauftragte Schnittstelle und Judith-AI-Oberfläche: [PROJEKTSTAND_PREISKALKULATION.md](PROJEKTSTAND_PREISKALKULATION.md). Kosten nur serverseitig und ausschließlich Judith; gekennzeichnete Schätzungen, keine automatischen Kundenpreisänderungen/Versand. 16 Rechen-/Schnittstellentests bestanden; authentifizierte Live-Abnahme noch offen. [Gesamtübersicht](PROJEKTUEBERSICHT_GESAMT.md).

Preisberater-Produktivstand: PR #56 / `e7e5c007112888d7d6c75e62bfa0fee62d62d3d3` veröffentlicht, Deployment 41452819480 erfolgreich, 16 automatische Tests und anonymer Live-Zugriffsschutz bestanden. Preisberater-Kachel im ausgelieferten Live-DOM nachgewiesen; authentifizierte Bedienprüfung weiterhin offen. Details: [Preiskalkulation](PROJEKTSTAND_PREISKALKULATION.md).


## Preisberater Phase 2 – 2026-11-02
Neue Judith-only Rechnungszuordnung und laufende Kostenbasis; persistierte Empfehlungen, Team-Einschätzungen und sichere Foto-/Mail-/Auftragszuordnung. Keine Änderung vereinbarter Kundenpreise oder Friedrich-Funktionen. 24 Programmtests und 19 echte PostgreSQL-Assertions bestanden; Testdaten zurückgerollt. Neue service-only Tabellen mit RLS ohne direkten Mitarbeiter-/anonymen Zugriff. Vorhandene sechs Rechnungspositionen aus drei Belegen bleiben wegen ungeprüfter Quelle offen. Authentifizierte Live-Bedienung im verfügbaren Browser mangels Sitzung nicht bestätigt. Vollständige Details, Dateien, Grenzen und Nachweise: [PROJEKTSTAND_PREISKALKULATION.md](PROJEKTSTAND_PREISKALKULATION.md), [Gesamtübersicht](PROJEKTUEBERSICHT_GESAMT.md).


## Phase 2 – Veröffentlichungsnachweis 2026-11-02
- PR [#58](https://github.com/MarkusRuess/gastropilot-app/pull/58) zusammengeführt; Produktivcommit `81f9ed0814c90c637fd0043ef8e72f8cc46443eb`.
- [GitHub-CI 41457462938](https://github.com/MarkusRuess/gastropilot-app/actions/runs/41457462938) erfolgreich: 24 Programmtests, Inline-/Modulsyntax und echter anonymer Live-POST wird mit HTTP 401 abgewiesen. Vor Merge ebenfalls CI 41457386215 erfolgreich.
- [Pages-Deployment 41457462905](https://github.com/MarkusRuess/gastropilot-app/actions/runs/41457462905) erfolgreich. Live-Seite neu geladen: Phase-2-Modulkennung und Foto-Entwurfsübergabe im tatsächlich ausgelieferten DOM nachgewiesen; keine Anwendungsfehler in der Browserkonsole beobachtet.
- Preisberater und Foto-Auftragsfunktion jeweils Version 4 ACTIVE, verify_jwt=true; tatsächlich deployte Quelldateien exakt mit geprüftem GitHub-Stand verglichen.
- 19 PostgreSQL-Assertions mit ROLLBACK erfolgreich; keine QA-Zutaten verblieben. Direkter Mitarbeiter-/anonymer Tabellenzugriff und RPC-Ausführung gesperrt, Service-Zugriff nachgewiesen.
- 18 geänderte Repository-Dateien geprüft: kein Friedrich-Code, keine gemeinsame GastroPilot-Startseite, kein gemeinsamer Belegimport geändert.
- **Keine vollständige authentifizierte Live-Bedienabnahme:** Browser meldet weiterhin „Keine Anmeldung vorhanden“. Foto-/Mail-/Kalenderabläufe sind durch Programm-/Datenbanktests geprüft, aber nicht als echte Mitarbeiter-Browsersitzung bestätigt. Keine Testkonten angelegt.
- Sechs Positionen aus drei echten Rechnungen weiterhin `review_source`; keine ungeprüfte Preisübernahme erzwungen. [Detailstand](PROJEKTSTAND_PREISKALKULATION.md).


## Preisberater – abschließende Qualitätskontrolle 2026-11-02
Dezimalverarbeitung numerischer DB-Werte korrigiert; Hochzeitstag/Wiederholungs-Portionen/Prinzess-Schreibweisen und nicht enthaltene Lieferleistungen verbessert. 26 echte Aufträge lesend nachgerechnet: 14 mit vorhandenen Angaben berechenbar, 12 ohne eindeutige Portionen. 28 Programmtests und 19 zurückgerollte PostgreSQL-Assertions bestanden. Drei Originalbelege für sechs offene Positionen visuell geprüft; keine Buchung/Freigabe erzwungen. Vorher-/Nachher-Prüfsummen für Aufträge, Kunden, Dokumente und Einschätzungen identisch. Authentifizierte Live-Bedienung und endgültige wirtschaftliche Freigabe weiterhin unbestätigt. Details: [Preiskalkulation](PROJEKTSTAND_PREISKALKULATION.md).


## QA-Veröffentlichungsnachweis 2026-11-02
- PR [#60](https://github.com/MarkusRuess/gastropilot-app/pull/60) zusammengeführt, Produktivcommit `21810dfe9da1e545e6e4b560010612b8b85edeae`.
- [GitHub-CI 41460682804](https://github.com/MarkusRuess/gastropilot-app/actions/runs/41460682804) erfolgreich: 28 Programmtests, Syntax und echter anonymer Live-POST (HTTP 401). Vor Merge ebenfalls CI 41460549473 erfolgreich.
- [Pages-Deployment 41460682915](https://github.com/MarkusRuess/gastropilot-app/actions/runs/41460682915) erfolgreich. Preisberater-Edge-Function Version 5 ACTIVE, verify_jwt=true; beide tatsächlich deployten Quelldateien exakt mit geprüftem Repository-Stand verglichen.
- Originalbelege: alle drei Fotos anhand SHA-256 exakt mit den gespeicherten Quellverweisen abgeglichen und visuell gelesen. Keine Kopien/Beleginhalte/Kunden- oder Finanzrohdaten ins Repository geschrieben.
- Echte Daten nur lesend geprüft: 26 Datensätze, 14 mit vorhandenen Angaben berechenbar, 12 ohne eindeutige Portionen. Vorher-/Nachher-Prüfsummen von Aufträgen, Kunden, Dokumenten und bestehenden Einschätzungen identisch.
- 19 PostgreSQL-Assertions mit vollständigem Rollback erfolgreich. Keine tatsächliche Mitarbeiter-Einschätzung erzeugt oder bestehende Kundendaten verändert.
- Acht geänderte Dateien kontrolliert; kein Friedrich-Code oder gemeinsame GastroPilot-Startseite geändert.
- **Abnahmestatus: technisch geprüfte Korrektur veröffentlicht, keine vollständige fachliche/angemeldete Live-Freigabe.** Fehlende Browser-Sitzung, fehlende Portionen und unbestätigte betriebliche Zeit-/Kapazitätsansätze bleiben ausdrücklich offen. Die sechs Rechnungspositionen bleiben ohne ungeprüfte Kostenübernahme im bisherigen Prüfstatus.
