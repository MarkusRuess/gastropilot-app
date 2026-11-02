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

## 2026-11-02 – Gemeinsamer Preisberater
Neue ausdrücklich beauftragte Schnittstelle und Judith-AI-Oberfläche: [PROJEKTSTAND_PREISKALKULATION.md](PROJEKTSTAND_PREISKALKULATION.md). Kosten nur serverseitig und ausschließlich Judith; gekennzeichnete Schätzungen, keine automatischen Kundenpreisänderungen/Versand. 16 Rechen-/Schnittstellentests bestanden; authentifizierte Live-Abnahme noch offen. [Gesamtübersicht](PROJEKTUEBERSICHT_GESAMT.md).

Preisberater-Produktivstand: PR #56 / `e7e5c007112888d7d6c75e62bfa0fee62d62d3d3` veröffentlicht, Deployment 41452819480 erfolgreich, 16 automatische Tests und anonymer Live-Zugriffsschutz bestanden. Preisberater-Kachel im ausgelieferten Live-DOM nachgewiesen; authentifizierte Bedienprüfung weiterhin offen. Details: [Preiskalkulation](PROJEKTSTAND_PREISKALKULATION.md).


## Preisberater Phase 2 – 2026-11-02
Neue Judith-only Rechnungszuordnung und laufende Kostenbasis; persistierte Empfehlungen, Team-Einschätzungen und sichere Foto-/Mail-/Auftragszuordnung. Keine Änderung vereinbarter Kundenpreise oder Friedrich-Funktionen. 24 Programmtests und 19 echte PostgreSQL-Assertions bestanden; Testdaten zurückgerollt. Neue service-only Tabellen mit RLS ohne direkten Mitarbeiter-/anonymen Zugriff. Vorhandene sechs Rechnungspositionen aus drei Belegen bleiben wegen ungeprüfter Quelle offen. Authentifizierte Live-Bedienung im verfügbaren Browser mangels Sitzung nicht bestätigt. Vollständige Details, Dateien, Grenzen und Nachweise: [PROJEKTSTAND_PREISKALKULATION.md](PROJEKTSTAND_PREISKALKULATION.md), [Gesamtübersicht](PROJEKTUEBERSICHT_GESAMT.md).
