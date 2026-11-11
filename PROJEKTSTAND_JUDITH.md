# PROJEKTSTAND – GASTROPILOT JUDITH

## 2026-11-11 · Drei Handy-Tagesberichte

- Drei im Betrieb Judith gespeicherte Originalfotos vom 09., 10. und 11.11. geprüft. Die ersten beiden Berichte wurden durch die laufende App bereits automatisch erfasst. Der dritte lag noch als gesichertes `other/pending`-Original vor und wurde anhand des vom Betreiber beigefügten Fotos im **selben** Archivdatensatz nach Originalabgleich freigegeben. Vorherige Tagesbuchungen und Originalpfade blieben erhalten; keine neuen Konten oder Belege angelegt.
- Besonderheit: `Kredit Bezahlt` und eine positive `Kund.Forderungen`-Zeile bezeichnen den Eingang einer alten Forderung. Er ist in der Bareinlage enthalten, gehört aber nicht zu den heutigen Barumsätzen. Die serverseitige Judith-Nachprüfung zieht diesen Eingang nur bei ausdrücklich gedruckter, übereinstimmender Forderungszahlung und Null für weitere Aus-/Einzahlungen ab. Bei fehlenden oder widersprüchlichen Zeilen bleibt der Beleg zur Prüfung. Friedrich-Logik unverändert.
- Regressionstest erweitert: drei Tagesbericht-Formate und negative Fälle für fehlende Forderungszahlung und zusätzliche Bargeldbewegung. Der dritte Datensatz wurde anhand des Chat-Fotos manuell abgeglichen; dies ist kein nachgewiesener automatischer Handy-End-to-End-Lauf.


- **Veröffentlichung 11.11.:** [PR #114](https://github.com/MarkusRuess/gastropilot-app/pull/114) nach [Judith-CI 43049283636](https://github.com/MarkusRuess/gastropilot-app/actions/runs/43049283636) und [Friedrich-CI 43049283688](https://github.com/MarkusRuess/gastropilot-app/actions/runs/43049283688) zusammengeführt; Merge-Commit `587d0eecf2a406b4f1f8a097d043aa79f943bf00`. Edge Function `analyze-receipt` Version 56 ACTIVE. Drei `cash_report/auto_imported`-Datensätze 09./10./11.11. sind je genau einmal in Judiths Mandant gespeichert. Chromium-Touch-/Kamera-/Galerie-Komponententests bestanden; WebKit konnte in diesem GitHub-Runner wegen fehlender Systembibliotheken nicht starten. Angemeldete Live-Handy-/Dashboard-Prüfung bleibt offen.

**Live-Rückmeldung 06.11.2026:** Betreiber bestätigt „Passt, ist live“ für den korrigierten Judith-Abschluss. Dies belegt die Anzeige im eigenen produktiven Zugang; ein unabhängiger physischer iPhone-/Android-Neuupload wurde dabei nicht gesondert dokumentiert.

## 2026-11-06 · Judith-Bericht und Produktivstand

PR [#85](https://github.com/MarkusRuess/gastropilot-app/pull/85) wurde nach erfolgreichen Judith- und Friedrich-CI-Läufen (42255639332, 42255638613) zusammengeführt; Merge-Commit `47c13e3079501e3f25e967c9e72435df660129f9`. Die Supabase-Funktion `analyze-receipt` Version 50 ist ACTIVE und bytegleich mit den getesteten Quelldateien. Der vorhandene Judith-Abschluss 06.11.2026 steht genau einmal mit geprüftem Brutto, Zahlungsarten und aus Warengruppen berechneten Steuerwerten auf `auto_imported`; erneute Datenbankabfrage bestätigt den Zustand. Die öffentliche Live-Seite wurde unter dem bisherigen Link geöffnet, zeigte jedoch die Anmeldung. Eine authentifizierte Dashboard- und Smartphone-Bedienprüfung ist daher weiterhin nicht belegt.

## 2026-11-06 · Veröffentlichung und verbleibende Abnahme

PR #84 wurde nach CI #62 veröffentlicht; die gemeinsame Upload-Oberfläche und die Supabase-Erkennung Version 49 sind aktiv. Die formatspezifische Judith-Nachprüfung bleibt bei nicht eindeutig gedruckten Beträgen im Prüfstatus. Eine echte Judith-Fotoverarbeitung mit angemeldeter Mobilsitzung und anschließender Dashboardkontrolle wurde nicht nachgewiesen; keine Fertigmeldung für Judith.


## 2026-11-06 · Gemeinsamer Handy-Tagesabschluss (in Entwicklung)

Der bestehende gemeinsame Upload bleibt auf Judiths `business_id` begrenzt. PR #84 ergänzt nach dem Speichern der Originalseiten eine gezielte Steuer- und Zahlungsprüfung auch für Judith; unlesbare Steuergruppen oder Zahlungsarten bleiben im Prüfstatus statt als Umsatz geschätzt zu werden. Die Judith-Tagesberichte haben ein anderes Kassenformat als BONit (u. a. "Umsatz berichtigt", "Kreditk. / Bankomatkarten"); hierfür ist ein eigener Erkennungstext vorgesehen. Bestehende Judith-Daten und Judith AI wurden nicht verändert. Chromium-/WebKit-Komponententests für den Picker bestanden in CI #57; automatische Liveverarbeitung, tatsächliche Mobilaufnahme und Dashboard-Abnahme sind noch offen.

Stand: 2026-11-02. Quelle: lesender GitHub- und Supabase-Zugriff. **Keine Änderungen an Programmfunktionen oder Betriebsdaten.**

## Geltungsbereich und Statusdefinition
Nur **Judith und die Torten (J.W. GmbH)**. Repository `MarkusRuess/gastropilot-app`, gemeinsames Supabase-Projekt `gastropilot` (EU-West-1). **Nachgewiesen** = direkt durch lesenden Code-/Datenbankbefund bestätigt; **implementiert** = Code/Struktur vorhanden, ohne erfolgreichen Laufzeittest; **berichtet** = früherer manueller Praxistest, in dieser Prüfung nicht reproduziert; **offen** = kein belastbarer Nachweis. Eine vorhandene Tabelle allein belegt keine funktionierende Benutzeroberfläche.

## Architektur und Dateien
- `index.html`: tatsächlich auf GitHub gelesen. Gemeinsame Web-Oberfläche für zwei Betriebe, CSS/Responsive-Dashboard, Monatsnavigation, Upload- und Auswertungsoberflächen; Judith-spezifische Laufzeitpfade müssen getrennt geprüft werden. Keine vollständige Code-/Funktionsabnahme durchgeführt.
- `judith-ai/postfach.html`: tatsächlich auf GitHub gelesen; eigenständige Judith-AI-Oberfläche. **Nur lesend geprüft; keine Änderung erlaubt.**
- `README.md`, `package.json`, `judith.html`, `js/app.js`, `app.js`: unter diesen Pfaden nicht gefunden; daraus folgt **nicht**, dass es keine weiteren Dateien gibt.
- Supabase/PostgreSQL 17, Projektstatus ACTIVE_HEALTHY am 02.11.2026. Authentifizierung und RLS müssen je Tabelle/Benutzerrolle separat geprüft werden. Die Repository-Gesamtdateiliste, Hosting-/Deployment-Version und sämtliche Bankimport-Funktionsnamen wurden noch nicht vollständig inventarisiert.

## Funktionen: tatsächlicher Stand
| Bereich | Status | Befund / offene Abnahme |
| --- | --- | --- |
| Umsatzdashboard, Monatsübersicht | Implementierte Oberfläche | `index.html` enthält Dashboard-/Monats-CSS; Umsatzberechnung, Betriebstrennung und Liveansicht nicht end-to-end getestet. |
| Tagesabschlüsse / Umsatzanalysen | Datenmodell vorhanden | `cash_reports`, `monthly_cash_summaries`, `handcash_daily_sales`; korrekte Zuordnung und Vollständigkeit für Judith offen. |
| Lieferantenrechnungen / Kosten | Datenmodell vorhanden | `documents`, `expenses`, `monthly_cost_ratio_inputs`; Import, Netto/USt, Status, Monatszuordnung offen. |
| Personal-/Wareneinsatz | Datenmodell vorhanden | `personnel_costs`, `gp_article_costs`, `gp_cost_alerts`; Quotenauswertung und Ist-Wareneinsatz nicht end-to-end geprüft. |
| Rezepte / Artikel | Datenmodell vorhanden | `gp_recipes`, `gp_recipe_ingredients`, `gp_article_costs`; Preise und Berechnungen nicht geprüft. |
| Bank-PDF-Import | Berichtet/teilweise implementiert | Historische Entwicklung zu PDF-Dateinamen, erneutem Auslesen und Erkennung bekannt; vollständige Codeprüfung, PDF-Test und Speicherprüfung offen. |
| Banktransaktionen speichern | **Nachgewiesen** | Für Judith 247 Datensätze in `bank_transactions`; 196 positive Beträge (nicht automatisch alles Kundenzahlungen). |
| Rechnungsnummern-Erkennung | Offen | In 40 positiven Buchungen ergab eine grobe Textmustersuche Hinweise; keine Bestätigung von 40 gültigen Rechnungsnummern. Erkennung und Zuordnungsqualität testen. |
| Duplikatschutz | **Datenbankseitig nachgewiesen** | `UNIQUE (business_id, source_hash)`; bei Judith 247 verschiedene, nichtleere Hashes für 247 Buchungen. Semantische Dubletten bei abweichenden Hashes nicht ausgeschlossen. |
| Zuordnung Bank zu Lieferantenrechnung | Datenmodell vorhanden | `bank_invoice_matches`; keine vollständige Matching-Abnahme. |
| Judith AI: Kundenzahlungsanzeige | **Berichtet**, nicht neu getestet | Frühere manuelle Bestätigung für Juli–Oktober 2026. `judith-ai/postfach.html` existiert; Read-only, Filter, Monatswechsel, Rechnungsnummer und Zugriffsschutz nicht end-to-end abgenommen. |
| Mobilansicht / rosa Judith-Design | Teilweise implementiert | Responsive CSS in `index.html`; Judith-spezifisches Rosa und Bedienbarkeit am Gerät nicht neu getestet. |

## Relevante Supabase-Tabellen und Verbindungen
- `businesses` → `business_id` in `bank_transactions`, `documents`, `expenses`, `cash_reports`, `sales_invoices` und zahlreichen weiteren Tabellen: strikte Betriebszuordnung erforderlich.
- `bank_transactions`: `id`, `business_id`, `account_name`, `booking_date`, `payee`, `description`, `amount`, `category`, `match_status`, `source_hash`, `created_at`. **Kein eigenes Rechnungsnummern-Feld** in dieser Tabelle; Referenzen müssen über Text/andere Logik ermittelt werden.
- `bank_invoice_matches`: `business_id`, `bank_transaction_id`, `expense_id`, `matched_amount`, `verified_by`, `verified_at` (plus `id`).
- `documents` → `expenses` über Dokumentbezug; `sales_invoices` und `sales_invoice_items` für Ausgangsrechnungsdaten.
- `cash_reports`, `monthly_cash_summaries`, `handcash_daily_sales`: Tages-/Monatsumsatz.
- `personnel_costs`, `monthly_cost_ratio_inputs`, `gp_article_costs`, `gp_recipes`, `gp_recipe_ingredients`, `gp_revenue_targets`: Controlling.
- Judith-AI-Tabellen (z. B. `judith_ai_access`, `judith_ai_customers`, `judith_ai_inquiries`) existieren im selben Projekt. **Keine Änderung an diesen Tabellen oder Judith AI.** Exakter Leseweg der Zahlungseingänge noch nachzuweisen.
- Stichprobenbefund: Die Tabellen `businesses`, `documents`, `cash_reports` und `expenses` haben RLS aktiviert. **Keine vollständige RLS-/Policy-Sicherheitsprüfung.**

## Risiken, bekannte offene Punkte
1. **Vor Testbetrieb beheben/prüfen:** PDF-Import einschließlich Wiederholung, unterschiedliche Dateinamen, Fehlerbehandlung und dauerhafte Persistenz; niemals doppelt buchen.
2. **Vor Testbetrieb prüfen:** Sichere Rechnungsnummernerkennung, keine Zuordnung bei Unsicherheit, korrekte Trennung von Kundenzahlungen und sonstigen Eingängen.
3. **Vor Testbetrieb prüfen:** Judith-AI-Anzeige ausschließlich lesend, Monatswechsel, nur Judith-Buchungen, Datum/Name/Betrag/Rechnungsnummer; keine ETRON-Autobuchung.
4. **Vor Testbetrieb prüfen:** Auth/RLS, business_id-Filter in sämtlichen Lese-/Schreibwegen; keine Vermischung mit Friedrich.
5. **Offen:** End-to-End-Abnahme Umsatzdashboard, Tagesabschlüsse, Kosten-/Personalquoten, Rezepturen und mobile Darstellung.
6. GitHub-Issue #20 ist offen: persistente Belegannahme, Monatszuordnung, Bankabgleich und Wareneinsatz-/Einkaufsquoten-Abnahme.
7. Keine in dieser Prüfung reproduzierten Laufzeitfehler dokumentiert. **Nicht getestet ist nicht fehlerfrei.**

## Empfohlene nächste Schritte
1. Vollständige Repository-Dateiliste und aktuelle Deploy-Version lesen; Bankimport- und Judith-AI-Lesefunktionen samt konkreten Dateipfaden nachtragen.
2. Nur lesende Prüfungen der Bankbuchungs-Monate, Matching-Daten, RLS-Policies und Dubletten-Muster.
3. In isolierter Testumgebung mit anonymisierten Belegen Import, wiederholten Import, Erkennung und Monatswechsel prüfen; keine produktiven Testbuchungen ohne Freigabe.
4. Nach Abnahme Dashboard/Kosten/Personal/Rezepturen separat testen und die Statusmatrix aktualisieren.
5. Nach **jeder abgeschlossenen Programmänderung** diese Datei mit Datum, Commit, betroffenen Dateien, Tests und Ergebnis aktualisieren.

## Verbindliche Schutzregeln
- Ausschließlich GastroPilot Judith bearbeiten; **GastroPilot Friedrich nicht verändern**.
- **Judith AI nicht verändern** ohne ausdrückliche Freigabe; bestehende Zahlungseingangsschnittstelle nur kontrolliert verwenden.
- Vor jeder Änderung aktuellen GitHub-Code, Projektstand und relevante Supabase-Struktur lesen.
- Rosa Design, vorhandene Funktionen, Monatsarchive und sämtliche Betriebsdaten erhalten.
- Keine Löschungen/Überschreibungen, keine Doppelbuchungen, keine unsichere Rechnungszuordnung, keine automatische ETRON-Buchung.
- Gemeinsamen Code nur mit nachgewiesener Nichtbeeinträchtigung Friedrichs verändern.
- Jede Änderung prüfen, Status als implementiert/getestet/geplant differenzieren und hier dokumentieren.
- Bank-, Kunden- und Personaldaten vertraulich behandeln, Kosten gering halten.

## Prüfprotokoll 2026-11-02
GitHub: `index.html` und `judith-ai/postfach.html` lesend abgerufen; GitHub-Issue #20 gelesen. Supabase: Projektstatus, Tabellen/Spalten, Bankanzahlen und UNIQUE-Constraint lesend geprüft. **Keine Programm-/Datenänderung**, ausschließlich diese Dokumentation neu angelegt.

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


## 2026-11-05 – Abschlussauftrag Fotoupload Judith & Friedrich, PR #79
- Vorhandene Korrektur aus `fix/mobile-photo-picker-20261105` übernommen; keine Neuentwicklung der Upload-/Erkennungslogik. Native Label-Aktivierung für Kamera und Foto-/Dateiauswahl; bestehende IDs, Change-Handler, Verarbeitung und Betriebszuordnung erhalten.
- Gesamtübersicht, Zentrale-/Judith-/Friedrich-Projektstände, aktuellen Quellcode und QA-Branch `qa/automated-checks-20261102` geprüft. QA-Branch nicht pauschal übernommen.
- Supabase-Struktur und bestehende Mitgliedschafts-/Owner-RLS der betroffenen Tabellen lesend geprüft. Keine Datenbank-, Rollen-, Berechtigungs- oder Judith-AI-Änderung. `analyze-receipt` prüft Benutzer und Betriebsmitgliedschaft; Aufrufe verwenden weiterhin `business_id`.
- Vorhandener SHA-256-Wiederholungsimport und getrennte Ablagepfade mit tatsächlich extrahierter `secureOriginal`-Funktion gegen In-Memory-Datenbank geprüft: Wiederholung innerhalb eines Betriebs verwendet vorhandenen Beleg; identische Datei im anderen Betrieb bleibt getrennt. Keine produktiven Testbuchungen oder Testnutzer.
- Lokal bestanden: 19 Belegseiten-Tests, 24 Lager-/Trennungs-Tests, 10 Einkaufs-Tests, 2 Hash-/Zuordnungsszenarien; Inline-/Edge-Syntax und statischer Zentrale-Test aus QA-Branch. Browserstart lokal technisch blockiert; deshalb separater GitHub-Actions-Lauf für Chromium/WebKit mit 390px und Touch.
- Reproduzierbare Zusatzprüfungen: `scripts/test-mobile-photo-picker.mjs`, `.github/workflows/qa-mobile-photo-picker.yml`. Synthetische Komponententests sind ausdrücklich keine vollständige Live-Belegerkennung.
- Echte Live-Bedienabnahme offen: bestehender Live-Link zeigt in der verfügbaren Sitzung die Anmeldung. Keine vorhandene angemeldete Sitzung und kein physisches Smartphone verfügbar. Deshalb sind Kameraaufnahme am Gerät, echte OCR und dauerhafte Speicherung beider Betriebe nicht als live bestätigt gemeldet.
- Bekannte unveränderte Grenze: bestehender Upload archiviert Originale vor der Erkennung in `invoice-originals`. Dieser reine Picker-Auftrag ändert weder bestehende Originale noch deren Aufbewahrung; die allgemeine Vorgabe temporärer Verarbeitung ist damit nicht neu technisch nachgewiesen.

### Automatischer Abnahmenachweis PR #79
- [Mobile-CI 42065717559](https://github.com/MarkusRuess/gastropilot-app/actions/runs/42065717559) erfolgreich auf `0c5852478cc4d20f4141b057d2e79da1e88de4cc`: 18 Komponenten-/Hashszenarien in Chromium und WebKit, je Judith/Friedrich bei 390px mit Touch; Kamera-/Galerie-Dateidialog, Auswahlübernahme, Leeren, Enter/Leertaste, betriebsgebundener Wiederholungsimport. Zusätzlich Inline-/Edge-Syntax und 19 Belegseitentests erfolgreich.
- Erste Zusatztestausführung scheiterte am unvollständigen Testaufbau (deaktivierter Leeren-Button); Test verwendet inzwischen unveränderte echte `drawQueue`-Funktion. Kein zusätzlicher App-Fehler und keine Neuentwicklung.
- Veröffentlichung über vorhandenen Pages-Workflow nach Merge von [PR #79](https://github.com/MarkusRuess/gastropilot-app/pull/79), bestehender Link `https://markusruess.github.io/gastropilot-app/`, Bereich Betrieb → Hochladen. Aktueller Merge-/Deploymentnachweis im PR.
- Keine vollständige Live-Fertigmeldung: physisches Smartphone, angemeldeter Upload, echte OCR und anschließende Datenpersistenz bleiben offen.

- Paralleler zweiter CI-Lauf zeigte einen intermittierenden Fokus-/Dateidialog-Timeout im Tastatur-Test nach Dialogabbruch. Tastaturtests deshalb in frischen isolierten Seiten ausgeführt; Touch-Tests und App-Code unverändert. Erneute CI vor Merge erforderlich.


## 2026-11-05 – Button HOCHLADEN: reproduzierter Fehler
`gpUploadShortcut` öffnete den äußeren Detailbereich, ließ aber `intake.mobileHidden` aus `showMobilePanel('monthlyReference')` bestehen. Deshalb blieb der Upload am Handy (max. 680px) unsichtbar. Korrektur: `openArea('upload')` entfernt diese Klasse nur am bestehenden Uploadbereich. Keine Änderung an OCR, Uploadverarbeitung, Betriebszuordnung, Datenbank oder Berechtigungen.
Vorher scheiterten zwei neue Regressionstests (Judith/Friedrich); nachher bestanden 55 Programmtests und Inline-/Edge-Syntax. Bestehender Browsertest prüft zusätzlich echten HOCHLADEN-Klick, sichtbaren Uploadbereich und erneutes Öffnen für beide Betriebe bei 390/1200px. Prüfungen im bestehenden Workflow qa-friedrich-stock.yml gebündelt; experimentellen separaten Picker-Workflow entfernt. Aktueller Prüf-/Veröffentlichungsnachweis in PR #79. Echte angemeldete Kameraaufnahme/OCR/Persistenz bleiben bis tatsächlicher Bedienprüfung offen.


### Veröffentlichungsnachweis HOCHLADEN – 2026-11-05
- PR [#79](https://github.com/MarkusRuess/gastropilot-app/pull/79) zusammengeführt; Produktivcommit `b681a564481828a970d60ac5914268b34203a3be`.
- [CI vor Merge](https://github.com/MarkusRuess/gastropilot-app/actions/runs/42070264088) und [CI nach Merge](https://github.com/MarkusRuess/gastropilot-app/actions/runs/42070535454) erfolgreich: 55 Programmtests, Syntax und tatsächliche HOCHLADEN-Browserklicks im bestehenden Cockpit für Judith/Friedrich bei 390/1200px. Initial ausgeblendeter Upload wird sichtbar und lässt sich erneut öffnen. Browser verwendet isolierte Testdaten, keine produktive Anmeldung.
- [Pages-Deployment](https://github.com/MarkusRuess/gastropilot-app/actions/runs/42070535439) erfolgreich; zusätzlicher Pages-Lauf 42070535186 ebenfalls erfolgreich. Bestehender Link unverändert: `https://markusruess.github.io/gastropilot-app/`.
- Tatsächlich ausgeliefertes Live-HTML per HTTPS geladen und bytegenau mit dem getesteten index.html verglichen: identisch; SHA-256 `f10e536bd311ccc7db6e04651a7598f02c6c618df51adb75c2eedff63a83913c`. HOCHLADEN-Korrektur und native Fotoauswahl enthalten.
- Technische Veröffentlichung bestätigt; vollständige angemeldete Smartphone-Kameraaufnahme/OCR/Persistenz weiterhin nicht behauptet. Keine Betriebsdaten-/Berechtigungsänderung; Judith AI unverändert.

## 2026-11-06 – Tagesbericht mit Kredit und negativen Gegenbuchungen
- Originalfoto des Judith-Tagesberichts visuell mit vorhandenem Archivdatensatz abgeglichen. Der Kassenbericht enthält berichtigten Bruttoumsatz, Beleganzahl und drei getrennte negative Gegenbuchungen für Bareinlage, Karte und Kundenforderungen. Netto und Steuer wurden aus gedruckten Warengruppen mit Steuersätzen centweise berechnet und als berechnet gekennzeichnet.
- Der vorhandene Judith-Archivdatensatz wurde mit Datums-, Betriebs-, Status-, Brutto- und Dublettenschutz einmalig auf `auto_imported` gesetzt; kein zusätzlicher Datensatz oder Bonit-Abschluss angelegt. Originalnotizen und Originalpfad bleiben erhalten.
- Dauerhafte Edge-Function-Korrektur: Judiths gedruckte Warengruppen mit Steuersätzen vollständig gegen den berichtigten Umsatz prüfen, negative Kassen-Gegenbuchungen anhand der Originalbeschriftungen zuordnen und Kredit weder Bar noch Karte zuschlagen. Fehlt eine Gruppe oder Zahlungsart oder stimmt die Summe nicht, bleibt der Abschluss zur Prüfung. Friedrich-Zweig unverändert. Regressionstest `scripts/test-judith-daily-summary-20261106.mjs` im bestehenden CI-Workflow.
- Authentifizierte Live-Browser-/Handyprüfung und erfolgreiche Veröffentlichung erst nach Deployment gesondert belegen; bis dahin keine vollständige Live-Fertigmeldung.
