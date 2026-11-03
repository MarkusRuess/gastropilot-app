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


## 2026-11-03 – Monatskalender und rücknehmbare Auftragsstatus
- Konkreter Auftrag erlaubt isolierte Judith-AI-Entwicklung und Produktivveröffentlichung. Main und QA-Branch `qa/automated-checks-20261102` verglichen; keine pauschale Übernahme.
- Kalender: jeder Auftrag separate geschlossene rosa Kachel mit Kunde, Anlass, Datum und echtem Status. „Auftrag öffnen“ öffnet genau eine Kachel. Auftrag/Kunde direkt bearbeitbar, Preisberater standardmäßig geschlossen und ohne automatischen Berechnungsaufruf. Keine zusätzlichen Foto-Uploads oder KI-Aufrufe.
- Vier sichtbare Auftragsstatus: Beauftragt, In Arbeit, Abholbereit, Abgeholt. Zusätzliche nullable Spalte `fulfillment_status` erhält vorhandene `confirmed`-/`picked_up`-Semantik und Rezeptzuordnungen. Gemeinsame Anzeige in Kalender, Aufträgen/Backstube und Kundenkartei. Statuswechsel über geschützte `judith-ai-inbox`; explizite Abholbestätigung, Rücknahme löscht Abholzeit/-benutzer. Schutz vor veralteter Ansicht und konkurrierenden Statusschreibvorgängen. Cache nach Änderungen invalidiert; andere Tabs/Fenster und Rückkehr zum Fenster aktualisieren die Ansichten.
- Datumseingabe: nachgewiesenen übermaskierten ISO-Datumsregex im bestehenden Editor korrigiert. Kundenpreise werden nicht geschrieben.
- 06.11.2026 read-only geprüft: zwei `confirmed`-Aufträge, beide ohne `picked_up_at`. Kein nachgewiesener Datenfehler; irreführender bisheriger Aktionsbutton „Torte abgeholt“ durch echte Statusanzeige ersetzt. Keine echten Aufträge korrigiert.
- Migration `20261103114503_judith_calendar_fulfillment_status` angewendet; RLS und Grants unverändert. Transaktionaler DB-Test: Produktionsstufen, Abholung, Rücknahme, ungültiger Status, RLS/Grants; vollständiges ROLLBACK.
- Lokal: 14 Kalender-/Servertests sowie 28 bestehende Preisberatertests bestanden; beide Inline-Skripte syntaktisch geprüft. Desktop-/Mobil-Browsertest mit ausschließlich synthetischen lokalen API-Antworten ist als CI-Check angelegt; Ergebnis und Veröffentlichungsnachweis folgen. Lokaler Browserdownload in dieser Umgebung nicht ausführbar.
- Security Advisor: bestehende service-only Tabellen ohne RLS-Policies, kein neuer Befund durch diese additive Änderung; bestehende Warnung zur Passwort-Leak-Prüfung unverändert. Keine Zugangsdaten oder Kundenrohdaten im Repository.
- Abnahmegrenze: echte angemeldete Mitarbeiterbedienung und geräteübergreifende Bedienung dürfen erst nach tatsächlichem Nachweis als live bestätigt gelten. Keine Testkonten angelegt. Keine Änderung an GastroPilot-Oberfläche, Friedrich, Judith-Finanzen oder Zahlungsschnittstellen.


## Veröffentlichungsnachweis – Monatskalender, 2026-11-03
- PR [#69](https://github.com/MarkusRuess/gastropilot-app/pull/69) zusammengeführt; Produktivcommit `046a9bbc3c6a2080b04f0e72b89c42d21e1222d2`.
- [Kalender-CI vor Merge](https://github.com/MarkusRuess/gastropilot-app/actions/runs/41631062387) und [nach Merge](https://github.com/MarkusRuess/gastropilot-app/actions/runs/41631214248) erfolgreich: 42 Programm-/Handler-/Preisberatertests, Syntaxprüfung und 28 Browserassertionen bei 1280/390 px. Browser testet ausschließlich synthetische API-Antworten: neun Tageseinträge vollständig, anfangs geschlossen, exklusives Öffnen, Bearbeitungsformulare, kein automatischer Preisabruf, vier Stufen, Abholung abbrechen/bestätigen/rücknehmen, Neuladen und Backstubenlink, kein horizontaler Überlauf oder JS-Fehler.
- [Produktiv-Pages-Deployment](https://github.com/MarkusRuess/gastropilot-app/actions/runs/41631214449) erfolgreich; zusätzlicher Pages-Lauf 41631213846 ebenfalls erfolgreich. Bestehende Adresse unverändert: `https://markusruess.github.io/gastropilot-app/judith-ai/postfach.html`.
- `judith-ai-inbox` Version 18 ACTIVE, verify_jwt=true; tatsächlich deployter Quelltext exakt mit dem geprüften Repository-Stand abgeglichen. Echter anonymer Live-PATCH wird mit HTTP 401 abgewiesen.
- Live-Browser neu geladen: Kalender-Modulkennung `20261103-calendar` und Kalender-CSS im tatsächlich ausgelieferten DOM vorhanden. Die vorhandene Anmeldesperre funktioniert; Browser meldet „Keine Anmeldung vorhanden“. **Echte authentifizierte Mitarbeiterbedienung und geräteübergreifender Live-Statuswechsel bleiben unbestätigt.** Kein Testkonto, keine erfundene Betriebsabnahme.
- Vorher-/Nachher-Prüfsumme aller ursprünglichen Auftragsfelder identisch; zwei Aufträge am 06.11. unverändert `confirmed`, keine Abholzeit. Synthetische DB-Testdaten vollständig zurückgerollt. RLS und direkte Schreibsperren nachgewiesen.
- Nur elf Judith-AI-/Test-/Dokumentationsdateien geändert; keine Änderungen an gemeinsamen GastroPilot-Seiten, Friedrich, Judith-Finanzen oder Zahlungsschnittstellen. Kein neuer Dateispeicherpfad; bestehende Originaldateien und bestehende Aufbewahrungslogik unverändert.

## 2026-11-03 – Aufträge & Backliste
- Konkreter Auftrag: bestehende Dashboard-Kachel umbenannt, keine neue Kachel. Zwei unabhängig klappbare Bereiche; einzelne rosa Auftragskacheln mit Kunde, Termin, Anlass, Größe, Geschmack und Status. Nur ein Auftrag offen; Bearbeitung und Abholung im geöffneten Auftrag erhalten. Preisberater standardmäßig geschlossen und erst auf Wunsch geladen.
- `judith-ai/backlist.mjs`: rein lokale Auswertung vorhandener bestätigter Aufträge (inklusive bereits abgeholter, damit die historische Wochenliste vollständig bleibt), ISO-Woche Montag–Sonntag, kommende Woche als Standard nach Wiener Datum, Größen/Geschmäcker getrennt, explizite Stückzahlen/Bestandteile; keine KI-Aufrufe. Stornierte/gelöschte Datensätze ausgeschlossen, identische IDs nur einmal gezählt.
- Fehlende oder mehrdeutige Größen/Geschmäcker/Mengen ausdrücklich „Bitte prüfen“; unbekannte Mengen werden nicht in eine erfundene Gesamtsumme umgerechnet. Bestätigte Aufträge ohne Datum werden zusätzlich gemeldet. Freitext kann nicht zuverlässig jede beliebige handschriftliche Formulierung strukturieren; unklare mehrstöckige Torten müssen je Bestandteil präzisiert werden.
- Bestehende geschützte Auftragsbearbeitung ergänzt um optionale Zeilen `Anzahl | Größe | Geschmack` je Torte/Etage. Speicherung als `Backliste:`-Zeilen im bestehenden Feld `details`, keine Datenbankmigration, keine Änderung bestehender Aufträge/Preise durch die Einführung. Vorhandene Beschreibung bleibt erhalten. Keine Produktions-/Lagerplanung.
- Backliste liest frisch über den JWT-geschützten, ausschließlich lesenden Abruf `judith-ai-inbox?view=backlist&start=…&end=…` (bestehende aktive Judith-AI-Mitarbeiterberechtigung, datierte Wochenaufträge plus bestätigte Aufträge ohne Datum, Schlüssel-Paginierung in 500er-Seiten, nur Kundenname, ohne Bilder/Signier-URLs/Aufbewahrungsaktionen); Aktualisierung beim Öffnen, Wochenwechsel, eigener Bearbeitung, Rückkehr zur App und alle 60 Sekunden bei sichtbarer geöffneter Liste. Keine Hintergrund-KI oder zusätzliche Automation. A4-Druck zeigt ausschließlich Backliste und Prüfhinweise.
- Vor Entwicklung main, gemeinsame Übersicht und diesen Projektstand gelesen; `qa/automated-checks-20261102` verglichen, keine pauschale Übernahme. Supabase-Spalten und echte Auftragsbeschreibungen ausschließlich lesend geprüft. Keine Kunden-/Preis-/Zahlungs-/Auftragsdaten für Tests verändert; ausschließlich Judith-AI-Dateien, gezielte Tests und diese Dokumentation.
- Lokale Tests: 58 Rechen-/Handler-/Regressionstests bestanden (16 Backliste einschließlich vollständiger 1.101-Aufträge-Paginierung/Zugriffsschutz/Fehlerfall, 14 Kalender, 28 Preisberater), Inline-Syntax bestanden. Browser- und Veröffentlichungsnachweis siehe unten. Echte angemeldete Mitarbeiterbedienung bleibt unbestätigt.


### Veröffentlichungsnachweis – Aufträge & Backliste, 2026-11-03
- PR [#71](https://github.com/MarkusRuess/gastropilot-app/pull/71) zusammengeführt, Produktivcommit `08a533a8ec015e12d76ea3d4a99fb287e14d744b`. Die zwischenzeitlich veröffentlichte Kalenderentwicklung PR #69 wurde vollständig erhalten; ausschließlich deren Browserprüfschritt zum Öffnen des neuen Unterbereichs angepasst. Neun Judith-AI-/Test-/Dokumentationsdateien; kein GastroPilot-/Friedrich-/Finanzcode geändert.
- Vor Merge: Backlisten-CI `41632142742`, Kalender-CI `41632143037`, Preisberater-CI `41632143416` erfolgreich. Backlisten-CI nach Merge `41632282965` ebenfalls erfolgreich. Browserprüfungen ausschließlich mit synthetischen lokalen API-Antworten bei 390/1280 px: geschlossene Aufträge, exklusives Öffnen, unabhängige Bereiche, Summen/Bestandteile, Bearbeitung→Neuberechnung, eingeklappter Preisberater, A4-Druck/PDF, kein horizontaler Überlauf und keine JS-Fehler. Bestehende 28 Kalender-Browserassertionen weiterhin bestanden.
- Pages-Deployment [41632283125](https://github.com/MarkusRuess/gastropilot-app/actions/runs/41632283125) erfolgreich. Bestehende Live-Adresse unverändert: `https://markusruess.github.io/gastropilot-app/judith-ai/postfach.html`. Live-Browser neu geladen: Kachel „Aufträge & Backliste“, Backlistenbereich, Modulkennung `20261103-1` und vorhandene Kalenderkennung im tatsächlich ausgelieferten DOM nachgewiesen.
- `judith-ai-inbox` Version 19 ACTIVE, verify_jwt=true. Deployter Quelltext exakt mit geprüftem Stand verglichen. Neuer Backlisten-GET ausschließlich nach vorhandener Session-/Mitarbeiterprüfung; echter anonymer Live-GET liefert HTTP 401. Bestehende PATCH-, Kunden-, Abhol-/Rücknahme- und Inboxfunktionen unverändert. Keine Migration, Rollen-/RLS-/Grant-Änderung oder Erzeugung echter Testaufträge.
- KW 46/2026 anhand echter Aufträge ausschließlich lesend geprüft: zwei berücksichtigte Aufträge, beide ohne eindeutige Größe/Geschmacksrichtung; eine gespeicherte positive Stückzahl, ein gespeicherter Wert 0 bleibt ungeklärte Anzahl. Anzeige daher „Bitte prüfen“; keine Erfundenen Größen, Geschmäcker oder Mengen und keine automatischen Korrekturen.
- **Abnahmegrenze:** Live-Browser meldet „Keine Anmeldung vorhanden“. Auslieferung und anonymer Zugriffsschutz nachgewiesen; echte authentifizierte Mitarbeiterbedienung, tatsächlicher Druck am betrieblichen Drucker und Safari/iPhone-Endgeräteprüfung nicht bestätigt. Keine zusätzlichen Testkonten verlangt oder angelegt. Für die Backliste entstehen keine KI-Aufrufe und keine neuen Bild-/PDF-Speicherdateien.


## 2026-11-03 – Gesamtoptimierung Aufträge & Backliste
- Bestehende Kachel und zwei klappbare Bereiche bleiben erhalten. Auftragsfilter für Offen/Bestätigt/In Arbeit/Abholbereit/Abgeholt verwenden gespeicherten `status` und `fulfillment_status`; Standard: aktuelle, noch nicht abgeholte Aufträge, inklusive undatierter offener Vorgänge. Namen-/Datumsfilter, alle Status und Archiv bleiben zugänglich. Kein Auftrag wird gelöscht oder anhand des Kundennamens zusammengelegt.
- Backliste jetzt ausdrücklich **noch zu produzierende** bestätigte Aufträge: abgeholte, stornierte und gelöschte Vorgänge ausgeschlossen. Diese Anforderung ersetzt die historische Einschlussregel aus dem ersten Backlistenauftrag. Tortenböden und Füllungen separat; Etagen und Mehrfachmengen bleiben pro Bestandteil. Mehrere Füllungen erhöhen nicht die Bodenanzahl. Ungeklärte Mengen werden nicht in Produktionssummen gerechnet; fehlende Füllungen werden niemals aus Sorte oder Dekoration erfunden.
- Deterministische Auswertung des bestehenden `details`-Felds. Erweiterung der vorhandenen `Backliste:`-Zeilen um optionale vierte Spalte Füllung(en), abwärtskompatibel zu vorhandenen Dreispaltenzeilen. Freundlicher Formularbereich „Torten & Etagen“ statt technischer Trennzeichen-Eingabe, keine zusätzliche Tabelle, kein Duplikatspeicher, keine KI-Aufrufe. Nur bewusst bearbeitete Zeilen werden beim tatsächlichen Speichern übernommen; Datum-/Textbearbeitung allein erzeugt keine ungeprüfte Komponentenübernahme. Bestehende Beschreibungen und Preistext erhalten.
- „⚠️ BITTE PRÜFEN“ einmal je tatsächlicher Auftrags-ID, mit konkreten fehlenden Feldern und direktem „Ergänzen“-Formular. Nach Speichern frische Berechnung. Wochen-Navigation mit lesbarem Zeitraum und Vor-/Zurück, beliebige Woche zusätzlich über Datum erreichbar (auch ohne native Wochenfelder am iPhone). A4 zeigt Zeitraum, Böden, Füllungen, Gesamt und gesonderte Warnungen, keine Bedienfelder.
- Geschützter `view=orders` liest das gesamte Auftragsarchiv per Schlüssel-Paginierung; Bilder werden erst beim Öffnen des einzelnen Auftrags über `view=order_attachments` geladen/signiert. Vorhandene Authentifizierung/Mitarbeiterprüfung unverändert. Neuer Backlistenabruf filtert bereits serverseitig auf `confirmed`; Client schließt zusätzlich Abholzeit und ausgeschlossene Status aus. Keine Änderungen an Inbox-/Kunden-/Kalender-/Status-/Zahlungs-APIs außerhalb dieser gezielten Ergänzung; keine Änderung an GastroPilot.
- Aktualisierung beim eigenen Speichern/Statuswechsel, nach Rückkehr, in anderen Tabs per bestehendem Signal und bei sichtbar geöffneter Liste alle 60 Sekunden. Keine nächtlichen KI-Läufe oder separate Automationskosten.
- Vor Entwicklung beide Projektdokumente, aktuellen main und Supabase-Spalten/Status geprüft; QA-Branch verglichen, nicht pauschal übernommen. Datenbanktest `scripts/test-judith-backlist-db.sql` mit synthetischen Transaktionsdaten und vollständigem ROLLBACK erfolgreich; keine Testdaten verblieben. Prüfungen: getrennte Aufträge desselben Kunden, Komponenten-/Preistext-Erhalt, Produktions-/Abhol-/Datumszuordnung, RLS und direkte Schreibsperren.
- Programm-/Browser-/Veröffentlichungsnachweise folgen nach Abschluss; echte angemeldete Mitarbeiterbedienung wird gesondert ausgewiesen.


### Veröffentlichungsnachweis – Gesamtoptimierung, 2026-11-03
- PR [#72](https://github.com/MarkusRuess/gastropilot-app/pull/72) zusammengeführt; Produktivcommit `46c1cb615ee604a60b95975bc352410414969d45`. Neun Judith-AI-/Test-/Dokumentationsdateien; keine Änderung an GastroPilot Zentrale, Friedrich, Judith-Finanzen oder Zahlungsschnittstellen.
- 71 lokale Programm-/Handler-/Regressionstests und Inline-Syntax erfolgreich. GitHub-CI vor Merge: Backliste `41634705058`, Kalender `41634704968`, Preisberater `41634704848` erfolgreich. Nach Merge: Backlisten-CI `41634875830` erfolgreich. Tests umfassen echte Statusfilter samt Archiv, Namens-/Datumsfilter, Mehrfachmengen und Etagen, mehrere Füllungen ohne doppelte Bodenzählung, ungeklärte Mengen/Angaben, abgeholte/stornierte Torten, Kundenidentitäten und vollständige Paginierung, Zugriffsschutz und Fehlermeldung statt Teilsumme.
- Chromium-Browserprüfungen mit ausschließlich synthetischen lokalen API-Antworten bei 390/1280 px erfolgreich: Filter/Archiv, Kacheln einzeln öffnen/schließen, getrennte Bereiche, verständliche Wochen-/Jahreswahl, Füllungstabellen, direktes Ergänzen und automatische Neuberechnung, Preistext bleibt erhalten, offene Korrektur bleibt bei Aktualisierung erhalten, A4 mit beiden Tabellen und Warnungen als tatsächlich einseitiges PDF, keine Bedienelemente im Ausdruck, kein horizontaler Überlauf oder JS-Fehler und kein kostenpflichtiger Preisberater-API-Aufruf. Bestehende Kalender-/Abhol-/Rücknahme-/Kundenformular-Browserprüfungen weiter bestanden.
- Zwei tatsächliche PostgreSQL-Testskripte mit vollständigem ROLLBACK erfolgreich: neue Backlisten-Assertions und vorhandene Kalender-/Status-/RLS-Assertions. Vorher-/Nachher-Prüfsumme sämtlicher Aufträge identisch (`6b34ecf70ac1ec3886057b8babcbe9b4`); keine synthetischen Kunden oder Aufträge verblieben. Keine Migration und keine Änderung an Rollen, Grants oder RLS.
- `judith-ai-inbox` Version 20 ACTIVE, verify_jwt=true, deployter Quelltext exakt mit geprüftem Stand verglichen. Echte anonyme Live-GETs für `view=orders`, `view=backlist` und `view=order_attachments` jeweils HTTP 401. Bestehende Dateibereinigungsaktion bleibt beim einzelnen abgeholten Auftrag erhalten; keine neue automatische Löschung.
- Pages-Deployment [41634875984](https://github.com/MarkusRuess/gastropilot-app/actions/runs/41634875984) erfolgreich. Bestehender Link unverändert: `https://markusruess.github.io/gastropilot-app/judith-ai/postfach.html`. Im Live-Browser tatsächlich ausgeliefert: Modulkennung `20261103-opt2`, Komponentenmodul, alle sieben Filteroptionen, Vor-/Nächste-Woche-Schaltflächen und vorhandene Dashboard-Kachel.
- **Abnahmegrenze:** Live-Browser meldet weiterhin „Keine Anmeldung vorhanden“. Neue Version und Zugriffsschutz nachgewiesen; echte angemeldete Mitarbeiterbedienung, tatsächlicher betrieblicher Drucker und Safari/iPhone-Endgeräteprüfung nicht bestätigt. Kein zusätzliches Testkonto verlangt oder angelegt. Für diese Funktionen keine KI-Aufrufe, keine neue dauerhafte Foto-/PDF-Speicherung und keine separate kostenpflichtige Automation.


## 2026-11-03 – Einheitliches Entfernen und Wiederherstellen
- Konkreter Auftrag: Soft Delete für sämtliche Judith-AI-Aufträge. Keine echten Aufträge während der Entwicklung archiviert. Aktueller main, gemeinsame Übersicht, Projektstand, QA-Referenz und Supabase geprüft; zwischenzeitliche Backlisten-Dokumentation erhalten.
- Migration `20261103122453_judith_order_soft_archive`: nullable `archived_at`/`archived_by`, partieller Aktivindex. Keine Änderung vorhandener Auftragsfelder, Rollen, RLS oder Grants; keine Löschung von Kunden-, Zahlungs- oder Rechnungsdaten.
- Ausschließlich vorhandene aktive Rolle `owner` darf archivieren, wiederherstellen und Archiv lesen (serverseitig geprüft). Alle vier bestehenden Zugänge haben aktuell diese Rolle; keine Zugänge/Berechtigungen geändert.
- Einheitlicher Button „🗑️ Auftrag entfernen“ in Kalender, Auftragsverwaltung/Backstube, Kundenkartei und bei direkter Auftragskorrektur in der Backliste. Bestätigung mit Kunde und Abholdatum. Wiederherstellung über „🗃️ Entfernte Aufträge · Archiv“ innerhalb „Aufträge & Backliste“, ohne neue Adresse/Anmeldung.
- Alle aktiven Serverabrufe und die Backliste schließen archivierte Aufträge aus. Geschütztes Archiv vollständig paginiert. Veraltete Bearbeitung/Statuswechsel und Fotoabruf archivierter Aufträge gesperrt; bestehende automatische Bildaufbewahrung überspringt archivierte Aufträge. Status, Auftragsinhalte und Kunden-/Zahlungsverbindungen bleiben erhalten.
- Sofortige Entfernung sichtbarer Kopien, Cacheinvalidierung und Neuberechnung geöffneter Backliste; Aktualisierung aller geöffneter Ansichten und anderer Tabs über bestehendes Signal plus Archivsignal nur mit Auftrags-ID. Noch laufende alte Antworten können lokal archivierte Aufträge nicht wieder einblenden. Andere Geräte aktualisieren beim nächsten Abruf/Rückkehr; keine zusätzliche Realtime-/KI-Automation.
- 78 lokale Programm-/Handler-/Regressionstests und Inline-Syntax bestanden. Neue Handlerprüfungen: Zugriffsschutz, alle bisherigen Statusvarianten, Preis-/Kunden-/Abholzustand erhalten, Ausschluss aus allen aktiven Abrufen/Backliste, Wiederherstellung, Idempotenz, Konkurrenzschutz, keine Seiteneffekte beim Lesen.
- PostgreSQL-Test mit synthetischen Transaktionsdaten und vollständigem ROLLBACK erfolgreich. Security Advisor ohne neuen Befund; bestehende service-only Tabellen und Passwort-Leak-Warnung unverändert.
- Browser-/Veröffentlichungsnachweis folgt; echte angemeldete Mitarbeiterbedienung gesondert auszuweisen. Keine GastroPilot-/Friedrich-/Finanz-/Zahlungsschnittstellenänderung, keine automatische Dublettenarchivierung, keine neuen KI-Aufrufe.
