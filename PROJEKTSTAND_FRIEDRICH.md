# PROJEKTSTAND – GastroPilot Friedrich

**Stand:** 2026-11-02  
**Repository:** MarkusRuess/gastropilot-app  
**Betrieb:** Das Friedrich – Brot & Wasser RA GmbH  
**Supabase-Projekt:** gastropilot (`sjnwfwcpgwsavygewwzb`)  
**Prüfmodus:** lesender GitHub-/Supabase-Zugriff; keine Anwendung oder Betriebsdaten verändert.

## 1. Funktionsstand (Nachweisstufen)
Status **implementiert** bedeutet Code-/Tabellen-Nachweis, **gespeichert** bedeutet vorhandene Friedrich-Datensätze, **getestet** erfordert einen erfolgreichen End-to-End-Test. Die bloße Existenz einer Tabelle ist kein Funktionsnachweis.

| Funktion | Tatsächlicher Nachweis | Status |
|---|---|---|
| Login, Dashboard, PC/Mobil | HTML/CSS in `index.html` eingesehen; responsive Regeln vorhanden | Implementiert; Browser-Test offen |
| Bonit-Tagesabschlüsse | `bonit_daily_closings`: 27 Friedrich-Zeilen | Gespeichert; Vollständigkeit ungeprüft |
| Bonit-Einzelartikel / Top-30-Grundlage | `bonit_article_sales`: 2.162 Friedrich-Zeilen | Gespeichert; Auswertung und Dubletten ungeprüft |
| Dokumentenimport | `documents`: 113 Friedrich-Zeilen | Gespeichert; Erkennung und Fehlerpfade ungeprüft |
| Lieferantenkosten | `expenses`: 45 Friedrich-Zeilen | Gespeichert; Zuordnung und Summen ungeprüft |
| Lagerverwaltung | `gp_inventory_items`: 27 Friedrich-Zeilen | Gespeichert; Wertberechnung ungeprüft |
| Inventur-Monatsstände | `gp_inventory_snapshots`: 0 Friedrich-Zeilen | Schema vorhanden; Monatsabschluss nicht nachgewiesen |
| Rezepturkalkulation | `gp_recipes`, `gp_recipe_ingredients`, Zutaten- und Preis-Tabellen | Schema vorhanden; Rechenprüfung offen |
| Einkaufsplanung | `gp_purchase_price_queue`, Preis- und Artikeltabellen | Schema vorhanden; Funktionstest offen |
| Personal/Kosten | `personnel_costs`, `gp_ledger_monthly`, `monthly_cost_ratio_inputs` | Schema vorhanden; Friedrich-Datenprüfung offen |
| Umsatzziel / Fortschrittsbalken | CSS in `index.html`; `gp_revenue_targets` | Implementierungsindiz; Berechnungstest offen |
| CSV-Inventur / PDF-Inventur | Frühere Entwicklungsmeldungen: CSV eingebaut, PDF offen | Nicht in dieser Prüfung end-to-end verifiziert |

## 2. Architektur und relevante Dateien
- **Frontend:** GitHub-Repository `MarkusRuess/gastropilot-app`; `index.html` enthält die geprüften Layout-/Dashboard-Regeln einschließlich Mobilansicht, Einkaufsplanung und Fortschrittsbalken.
- **Backend/Datenhaltung:** Supabase/PostgreSQL 17; Projekt `gastropilot`, Region `eu-west-1`, Status bei Prüfung `ACTIVE_HEALTHY`.
- **Mandantentrennung:** Gemeinsames Supabase-Projekt mit `businesses`, `business_members` und `business_id` in zahlreichen fachlichen Tabellen. Trennung muss bei jeder Abfrage und Mutation überprüft werden.
- **Weitere Quelldateien:** Repository-Verzeichnisbaum und sämtliche JavaScript-Dateien wurden nicht vollständig inventarisiert. Geprüfte Pfade `friedrich.html`, `app.js`, `js/app.js`, `package.json` und `README.md` waren unter diesen Namen auf dem Standardbranch nicht auffindbar. Dies ist **kein Beleg**, dass es keine weiteren Dateien gibt.
- **Diese Datei:** `PROJEKTSTAND_FRIEDRICH.md` als verbindliches Änderungsprotokoll; vor jeder neuen Entwicklungsaufgabe lesen.

## 3. Supabase-Tabellen und Datenfluss
```text
Bonit-Abschluss → bonit_import_batches → bonit_daily_closings
                                     └→ bonit_article_sales → Artikelanalyse/Top 30
Upload → documents → expenses → Kosten-/Wareneinsatzanalyse
Lieferantenpreise → gp_purchase_price_queue / gp_ingredient_price_history
Rezept → gp_recipes → gp_recipe_ingredients → Kalkulation
Lagerzählung → gp_inventory_items → gp_inventory_snapshots (Monatsstand)
Betriebszuordnung: businesses.id → fachliche Tabellen.business_id
```
Diese Pfeile beschreiben die **fachlich vorgesehene Verbindung**, nicht durchgehend verifizierte Laufzeitaufrufe.

Weitere relevante Tabellen: `monthly_bonit_summaries`, `sales_invoices`, `sales_invoice_items`, `menu_prices`, `gp_article_costs`, `gp_ingredient_catalog`, `gp_ingredient_aliases`, `gp_ingredient_links`, `gp_friedrich_inventory_analysis`, `gp_cost_alerts`, `gp_revenue_targets`, `financial_statements`, `bank_transactions`, `bank_invoice_matches`, `payroll_bank_payments`.

**Wichtige Spalten:** `bonit_article_sales` besitzt `business_id`, `source_key`, `closing_date`, `z_number`, `article_number`, `quantity`, `gross_amount`; `gp_inventory_items` besitzt `business_id`, `quantity`, `net_unit_price`, `counted_at`; `gp_inventory_snapshots` besitzt `business_id`, `inventory_month`, `item_id`, `quantity`, `net_unit_price`.

## 4. Bereits abgeschlossene Entwicklungen – nachweisbar vs. berichtet
- **Nachweisbar gespeichert:** Friedrich-Bonit-Abschlüsse (27), Einzelartikel (2.162), Dokumente (113), Ausgaben (45), Lagerartikel (27).
- **Nachweisbar angelegt:** Datenbanktabellen für Rezepturen, Einkaufsplanung, Inventur-Monatsstände, Monatskennzahlen, Kosten und Personal.
- **Code-Nachweis:** Dashboard-/Mobil-CSS und Fortschrittsanzeige in `index.html`.
- **Aus früheren Arbeitsständen berichtet, nicht erneut getestet:** Artikelanalyse-Menü, Inventur-CSV, Einkaufsvorschläge, Rezepturansichten, automatische Importlogik und Navigation.

## 5. Befunde, Risiken, offene Aufgaben
1. **Hoch:** 0 Inventur-Snapshots trotz 27 Lagerartikeln: Monatsstand Oktober und Speicherablauf prüfen; nichts automatisch überschreiben.
2. **Hoch:** 27 Bonit-Abschlüsse und 2.162 Artikel auf fehlende Betriebstage, Z-Nummern, Summendifferenzen und doppelte `source_key` prüfen.
3. **Hoch:** Trennung Friedrich/Judith bei Imports, UI, Auswertungen, RLS und Schreiboperationen durch Tests belegen.
4. **Mittel:** Supabase-Sicherheitsadvisor meldet `gp_revenue_targets`, `bonit_devices`, `gp_ingredient_links` und `inventory_baselines` mit aktivem RLS, aber ohne Policies. Zugriffsmodell vor Änderungen prüfen; fehlende Policy bedeutet nicht automatisch Datenfreigabe.
5. **Mittel:** Fehlende FK-Indizes unter anderem `gp_inventory_snapshots.item_id` und `gp_recipe_ingredients.matched_ingredient_id`; Performance prüfen, bevor Indizes angelegt werden.
6. **Mittel:** Tabellen `bonit_article_reimport_stage_20261031` und `bonit_article_sales_backup_20261031` existieren. Import-/Backup-Herkunft klären; keinesfalls löschen.
7. **Mittel:** Dokumentenimport, Zahlungsstatus, Lieferanten-/Rezepturzuordnung, Top-30-Berechnung und mobile Bedienung noch nicht end-to-end abgenommen.
8. **Projektweit, ohne Eingriff in Judith:** Supabase meldet deaktivierten Schutz gegen kompromittierte Passwörter. Gesondert bewerten.
9. **Niedrig:** Backup-Tabelle `bonit_article_sales_backup_20261031` ohne Primärschlüssel; kein unmittelbarer Beleg für einen Produktionsfehler.
10. **Offen:** Vollständige GitHub-Dateiliste, Commit-/Testhistorie, Edge Functions und RLS-Policies im Detail nachprüfen.

## 6. Empfohlene nächste Entwicklungsschritte
1. Repository vollständig inventarisieren: Standardbranch, Dateibaum, Import-/Analysefunktionen, betroffene UI-Module und Tests.
2. Lesende SQL-Abnahme Friedrich: Tagesabschlüsse nach Datum/Z-Nummer; Artikelanzahl und Umsatz je Abschluss; Duplikate; offene Dokumente.
3. Lager-/Inventurprüfung: 27 Artikel, Preise, Mengen, Monatsstand, CSV und PDF-Export; fehlenden Snapshot zunächst nur diagnostizieren.
4. Mandantentrennung und Zugriffsregeln prüfen; Friedrich-only Tests vor jedem Commit.
5. End-to-End-Test mit Testdaten ohne Mutation bestehender Betriebsdaten; PC/Mobil und Fehlerfälle.
6. Erst nach gesichertem Befund gezielte Korrekturen, Regressionstest und Dokumentationsupdate.

## 7. Verbindliche Entwicklungsregeln
1. **Ausschließlich GastroPilot Friedrich** bearbeiten. GastroPilot Judith und Judith AI **niemals** ohne ausdrückliche separate Freigabe verändern.
2. Vor jeder Änderung aktuellen GitHub-Code, diese Datei und betroffene Supabase-Struktur lesen.
3. Alle Lese- und Schreiboperationen eindeutig auf Friedrichs `business_id` begrenzen; keine stillen Cross-Business-Zuordnungen.
4. Bestehendes Design, Funktionalität und Daten erhalten; keine Löschungen, Überschreibungen oder unkontrollierten Neuimporte.
5. Doppelte Buchungen/Artikelimporte durch eindeutige Schlüssel und nachvollziehbare Prüfungen verhindern.
6. Jede Änderung testen (einschließlich negativer Mandantentrennungstests) und hier mit Datum, Dateien, SQL, Ergebnis und offenen Risiken dokumentieren.
7. Keine produktiven Supabase-Migrationen ohne vorherige Schema-/Auswirkungsprüfung; Kosten und Datenbanklast gering halten.
8. Status strikt unterscheiden: **geplant / implementiert / Daten vorhanden / getestet / produktiv bestätigt**.
9. Änderungen an gemeinsam genutzten Dateien oder Tabellen nur bei nachgewiesener Friedrich-Isolierung; andernfalls zunächst stoppen und Freigabe einholen.

## Änderungsprotokoll
| Datum | Änderung | Verifikation |
|---|---|---|
| 2026-11-02 | Erste technische Bestandsaufnahme und Erstellung dieser Dokumentation; keine App-/DB-Änderung | GitHub-Datei nach Erstellung erneut abrufen |


## Gemeinsame Projektübersicht
Die verbindliche projektübergreifende Übersicht aller vier ChatGPT-Projekte, ihrer Zuständigkeiten, Repositories, Supabase-Verbindungen, Schnittstellen und Trennungsregeln steht in [PROJEKTUEBERSICHT_GESAMT.md](PROJEKTUEBERSICHT_GESAMT.md). Bei künftigen Änderungen diesen Projektstand aktualisieren; bei Änderungen an Architektur, Schnittstellen oder Zuständigkeiten zusätzlich die gemeinsame Übersicht und weitere betroffene Projektstanddateien pflegen.

## 2026-11-03 – Umsatzquellen
Code auf QA-Branch: Bonit-, Rechnungs- und Gesamtumsatz-Kacheln; Rechnungsdetails im Kalender; Rechnungspositionen in Top-30. Datenbank unverändert. Tests und Live-Veröffentlichung noch offen.
