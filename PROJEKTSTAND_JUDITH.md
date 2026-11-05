# PROJEKTSTAND – GASTROPILOT JUDITH

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

## QA-Nachtrag 2026-11-02 (nur Entwicklungsbranch)
- GitHub Actions Run 41424111246: statische Checks erfolgreich. Keine E2E-Freigabe.
- RLS für bank_transactions und gp_ledger_monthly anhand der Policies lesend geprüft; negative Mandantentests offen.
- Judith-AI-Zahlungsfunktion Version 3: JWT und aktive Zugangsprüfung; Judith-business_id fest; Kunden-/Rechnungsabgleich und Dublettensicherheit nicht vollständig belegt.
- Backup/Restore nicht nachgewiesen. Produktive Änderungen unterbleiben. Details: QUALITAETSSICHERUNG.md.


## Gemeinsame Projektübersicht
Die verbindliche projektübergreifende Übersicht aller vier ChatGPT-Projekte, ihrer Zuständigkeiten, Repositories, Supabase-Verbindungen, Schnittstellen und Trennungsregeln steht in [PROJEKTUEBERSICHT_GESAMT.md](PROJEKTUEBERSICHT_GESAMT.md). Bei künftigen Änderungen diesen Projektstand aktualisieren; bei Änderungen an Architektur, Schnittstellen oder Zuständigkeiten zusätzlich die gemeinsame Übersicht und weitere betroffene Projektstanddateien pflegen.


## 2026-11-05 – Judith Personalimport (QA, nicht veröffentlicht)
- Vorhandene Originale in `public.documents` und `invoice-originals` bestätigt: `4c7e63fb-be9a-4518-ae1b-6c2aad4b984b`, `e1a58724-4bbe-4d05-b6c7-38ebaaeaf299`, `98f497bf-91a5-4104-9be9-e038fc7a19a7`; Betrieb J.W. GmbH bestätigt. Zustände pending/error; Personalabrechnung Oktober fehlt in `personnel_costs`.
- QA-Änderung `index.html`: Personaldateien vor allgemeiner Rechnungserkennung abfangen, Monat aus Dateiname zuordnen, bestehende Originale in Uploadliste zur erneuten Prüfung anbieten. Keine automatische Kostenbuchung, solange Lohnset/Journal/Abgaben nicht abgeglichen sind; keine Änderung an Friedrich oder Judith AI.
- **Abnahme offen:** Der GitHub-QA-Commit ist kein Deployment. Authentifizierter Storage-Download, vollständige PDF-Extraktion, belastbare Lohnbuchungen, Personalquote, automatische End-to-End-Tests und Live-Bedienung sind nicht bestätigt. Keine produktiven Änderungen durchgeführt.


## 2026-11-05 – Personaloberfläche beider Betriebe (QA)
- `index.html` QA-Commit `eee8662`: Personal-Navigation lädt beim ersten Klick eine Monatsauswahl (Pfeile und Monat/Jahr) und Mitarbeiterhistorie. Ausschließlich `personnel_costs` und `employee_profiles` des gewählten Betriebs; alle gespeicherten Monate, neuester zuerst. Brutto, vorhandene Nettobezüge, Dienstgeberkosten und Summe werden ohne Vormonatsersatz angezeigt. Fehlende Werte bleiben offen; gleiche Namen sind ohne Mitarbeiter-ID nicht sicher unterscheidbar.
- Begonnene Judith-Uploadkorrektur `193e3284` im QA-Branch vorhanden. Drei Oktober-Originale im privaten Bucket nachgewiesen, aber PDF-Inhalte und vollständige Lohnabstimmung weiterhin nicht geprüft. **Kein belastbarer Oktober-Personalaufwand und keine Personalquote**. Umsatz/Quote in der neuen Ansicht noch nicht angebunden; Import und Duplikatsicherung nicht vollständig fertiggestellt.
- Nur GitHub-QA-Branch geändert; keine Datenbankmigration, kein Deployment, keine bestätigten automatischen Browser-/End-to-End-Tests oder Liveprüfung. Friedrich/Judith-Mandantentrennung im Code, negative RLS-Tests offen. **Nicht produktionsreif.**
