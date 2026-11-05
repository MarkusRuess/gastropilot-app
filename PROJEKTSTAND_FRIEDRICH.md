# PROJEKTSTAND – GastroPilot Friedrich

> Gemeinsame Zuständigkeiten: [PROJEKTUEBERSICHT_GESAMT.md](PROJEKTUEBERSICHT_GESAMT.md). Neuer Lagerstand und Prüfgrenzen siehe Änderungsabschnitt **Lager & Inventur 2026-11-02** am Ende. Frühere Zahlen oben sind die historische Bestandsaufnahme.

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

## Lager & Inventur 2026-11-02 – ausdrücklich beauftragte Weiterentwicklung

### Implementierung
- Eigene Friedrich-Kachel **📦 Lager & Inventur**: Lagerbestand, alle Artikel, gelegentliche Einzelzählungen, Belegzuordnung, Rezepturen und Monatsinventur. Keine tägliche Gesamtzählung; keine Mitarbeiter-/Zeiterfassung.
- Ein zentraler Upload. Friedrichs Rechnungseditor erhält Artikelnummer, Rechnungseinheit, Mengen, Einzelpreise, Positionssummen, Verpackungsangaben und Lieferdatum. Handschriftliche Listen werden als Daten ohne Fotoarchivierung zur Bestätigung bereitgestellt.
- `friedrich-stock.js` / `friedrich-stock-engine.mjs`: gemeinsame Bestands-/Einkaufsansichten, echte UTF-8-CSV mit BOM/CRLF und eigenständiges A4-PDF ohne PDF-Dienst.
- `index.html`: Friedrich-only Modulanbindung statt lokaler Wochenbestände. `upload.html`: Originalpositionsfelder und Retouren nur im Friedrich-Zweig erhalten. `supabase/functions/analyze-receipt/index.ts`: zusätzliche Extraktion ebenfalls ausschließlich Friedrich; Judith-Normalisierung unverändert getestet.
- `einkaufsplanung.html` verwendet denselben Supabase-Bestand. `friedrich-inventur.html` führt zum gemeinsamen Bestand; alte lokale Einträge bleiben unverändert und nur lesend exportierbar.
- Additive SQL-Quellen: `sql/friedrich-stock.sql`, `sql/friedrich-stock-rules.sql`, `sql/friedrich-stock-actions.sql`. Keine alten Mengen, Preise, Monatsstände, Dokumente oder Ausgaben überschrieben.

### Neue Datenverbindungen
| Objekt | Aufgabe |
|---|---|
| `gp_f_stock_products` → `gp_inventory_items` | Lager-Einheit, Umrechnungsfaktor, belegtes Einkaufsgebinde, Reserve |
| `gp_f_stock_counts` | Unveränderliche Einzelzählungen einschließlich bestätigter Nullbestände, Zeitpunkt und Tagesvollständigkeit |
| `gp_f_stock_rules` | Bonit-Artikelnummer → mehrere Zutaten und Verbrauch je Verkauf |
| `gp_f_stock_lines` → `documents` | Original-/Kandidatenpositionen, bestätigte Lieferungen, Retouren, Pfand/Transport, Konflikte |
| `gp_f_stock_supplier_rules` | Bestätigte Artikelnummer + Lieferant + Einheit + Verpackungsmerkmale für spätere automatische Zuordnung |
| `gp_f_stock_losses` | Gesonderte belegte Verluste; keine versteckte Verlustpauschale |
| `gp_f_stock_closings` | Unveränderliche Monatsendversionen mit Korrekturgrund, Mengen, Preisen, Zählzeit und Warnungen |
| `gp_f_stock_line_audit` | Vorheriger Stand jeder Lieferpositionskorrektur |
| `gp_f_stock_sales` | Eine Importquelle je Tag/Z; mehrere Artikel-/Gratiszeilen innerhalb desselben Berichts bleiben additiv |
| `gp_f_stock_state()` | Gemeinsame zeitliche Bestandsrechnung für Lager und Einkauf |
| `gp_f_stock_confirm()` / `gp_f_stock_add_product()` / `gp_f_stock_close()` | Transaktionale Belegbestätigung, Stammdatenanlage, versionierter Monatsabschluss |

Neue Tabellen erzwingen Friedrichs business_id. RLS erlaubt bestehende Friedrich-Eigentümer; keine neuen Judith-Policies. Bestands-RPCs verwenden SECURITY INVOKER. Eng begrenzte Capture-/Audit-Trigger liegen im nicht freigegebenen Schema `gp_stock_private`. Ein zusätzlicher Friedrich-only Ausgabentrigger verhindert erneute Kostenbuchungen derselben Lieferanten-/Rechnungsidentität; fehlende Identität bleibt zur Prüfung offen.

### Mengen und Zeit
- Villacher Bonit **2000**: **0,33 l** je Verkauf, Einkaufsgebinde **50 l**, auch bei alter Bonit-Beschriftung 0,3 l. Keine pauschalen 5 % Schankverlust.
- Illy: **1.500 g je Dose**, **8 g** je einfachem bekanntem Bezug, **16 g** für Espresso groß **1401**. Alte 5 Dosen werden rechnerisch zu 7.500 g umgerechnet; Original bleibt unverändert. Keine 6-kg-VPE. Andere Kaffees, insbesondere entkoffeiniert, werden nicht per allgemeinem Namensmuster Illy zugeordnet.
- Wein in 0,75-l-Flaschen: 1/8 l = 1/6 Flasche. Eindeutige vorhandene Bonit-Nummern wiederverwendet. Weißer Spritzer: 0,125 l Hauswein + 0,125 l Soda. Weitere belegte Zutatenmengen stammen aus `gp_ingredient_links`.
- Einkauf: Verbrauch der letzten abgeschlossenen Kalenderwoche × (1 + Reserve) − verfügbarer Bestand, auf tatsächliche Einkaufsgebinde aufrunden. Unbekannter Bestand oder Gebinde → **offen**. Fehlende reguläre Bonit-Tage Do–So und Summenabweichungen sichtbar; keine erfundene Hochrechnung.
- Bestand: letzte gültige Einzelzählung + spätere bestätigte Lieferungen − spätere Verkäufe − Verluste. Beleg-/Zähldatum entscheidet, nicht Uploaddatum. Alte Nullmengen bleiben unbekannt; neue bestätigte 0 wird einschließlich Monatsabschluss gespeichert. Negative Rechenmengen werden nicht still auf 0 gekappt.
- Wiederholte Rechnungsidentität erzeugt keine zweite Lieferung. Abweichende Re-Extraktion sperrt den betroffenen Bestand zur Prüfung und bewahrt Original/Kandidat/Audit. Geänderte Gebindemerkmale benötigen neue Bestätigung.
- Monatsabschluss zum Monatsende; Folgemonatslieferungen ausgeschlossen. Korrekturen erzeugen weitere Versionen und benötigen einen Grund. Alte `gp_inventory_snapshots` bleiben lesbar/exportierbar.

### Geprüft und noch nicht bestätigt
- **20 Node-Tests bestanden:** Bestellrundung, Reserve, unbekannt/Null, Kalenderwoche, Kaffeeanzeige, CSV, PDF-XRef, Retouren-/Gebindeerhalt und unveränderte Judith-Normalisierung.
- **PostgreSQL-Assertion-Suite bestanden, anschließend vollständiger ROLLBACK:** Umrechnung, Zählreset, verspätet geladene alte Lieferung, Retouren, bestätigte 0, Monatsversionen/Korrekturgrund/Monatsgrenze, mehrere Artikelzeilen, Tageszeitkonflikt, Wiederholungsimport, geänderte Gebinde, Pfand, Re-Extraktionskonflikt/Audit, doppelte Ausgaben, Originalartikel unverändert, Eigentümerzugriff und negative RLS-/Anonymtests. Keine Testkonten oder verbleibenden Testdaten.
- Inline-Syntax aller vier betroffenen Seiten und Edge-TypeScript geprüft; `pdfinfo` bestätigt gültiges A4-PDF.
- Browser-Komponententests für 390/1200 px: `scripts/test-friedrich-stock-ui.mjs` und eigener GitHub-Actions-Workflow. Lokale Ausführung zunächst durch fehlende Chromium-Binary blockiert; lokal kein bestandener Browsertest; nachfolgend GitHub-CI erfolgreich.
- **Authentifizierte Live-Bedienung offen:** verfügbarer produktiver Browser zeigt Anmeldeformular. Keine echten Zählungen oder Kundenpreise für Tests verändert.

### Fachlich offene Quellen und Grenzen
1. Bonit-Tagesaggregate haben keine Verkaufsuhrzeiten. Bei Überschneidung einer Tagesabrechnung mit einer Zählung mitten am Tag bleibt die exakte Menge unbekannt. Eine ausdrücklich vollständige Tagesendzählung oder spätere Zählung löst dies. Keine erfundenen Uhrzeiten.
2. Vorhandene Artikel ohne bestätigte Mengen/Preise bleiben offen; alte 0 wird nicht umgedeutet. Fünf vorhandene Rezeptzutaten werden ausschließlich als Stammdaten mit unbekanntem Bestand ergänzt.
3. Nicht belegte Cocktailkomponenten, Frizzante-Produktidentität, weitere Kaffeesorten und größere Gebinde bleiben zu prüfen. Bei Sarti ist die vorhandene 90-ml-Frizzante-Grundlage übernommen; weitere Mengen ausdrücklich offen.
4. Historische Rechnungspositionen werden zur Zuordnung bereitgestellt. Verlorene Mengenfelder können über die bestehende Originalauslesung ergänzt werden; keine pauschale kostenpflichtige Neuauslesung aller Belege angestoßen.
5. Bewertung: letzter bestätigter Netto-Einstandspreis vor Stichtag, sonst vorhandener Stammpreis. Historische Stammpreise besitzen kein Gültigkeitsdatum. Keine FIFO-/Durchschnittspreisbewertung oder vollständige steuerliche Abnahme.

### Veröffentlichungsnachweis – 2026-11-02
- PR [#62](https://github.com/MarkusRuess/gastropilot-app/pull/62) zusammengeführt; Produktivcommit `ea688e4e28bdcde10c363cafd2856f24c5c62b86`.
- [PR-CI 41464789972](https://github.com/MarkusRuess/gastropilot-app/actions/runs/41464789972) erfolgreich: 20 Node-Tests, Syntaxprüfungen und tatsächliche Chromium-Komponenteninteraktionen bei **1200 und 390 px** mit Fixtures. Die Logs bestätigen beide Durchläufe. Keine produktive Mitarbeitersitzung simuliert.
- [Produktiv-CI 41498904986](https://github.com/MarkusRuess/gastropilot-app/actions/runs/41498904986) ebenfalls erfolgreich.
- [Pages-Deployment 41498904979](https://github.com/MarkusRuess/gastropilot-app/actions/runs/41498904979) erfolgreich. Live-Seite erneut geöffnet: neuer Lager-Modulimport und Lager-Routing im tatsächlich ausgelieferten DOM nachgewiesen. Anmeldeformular sichtbar; authentifizierte Bedienabnahme weiterhin offen.
- Supabase-Migration `friedrich_stock_inventory_v1` erfolgreich angewendet. Produktiv lesend bestätigt: 32 Artikelprofile, 47 Rezeptkomponenten, 229 historische Belegpositionen zur Prüfung. Keine neuen tatsächlichen Zählungen oder Monatsabschlüsse für Tests angelegt.
- `analyze-receipt` Version **46 ACTIVE**, bestehende Authentifizierung unverändert. Zusätzliche Lagerfelder im deployten Quellcode bestätigt.
- Alle 27 ursprünglichen Inventurdatensätze stimmen einschließlich Mengen/Preisen/Zeitpunkten mit dem Fingerabdruck vor Migration überein. Supabase-Sicherheitsadvisor meldet keine neuen Lagerobjekte.
- Offene Quellenzuordnungen und Tageszeitgrenzen oben bleiben bestehen. Veröffentlichung ist keine Bestätigung erfundener Bestände oder vollständiger Cocktailrezepte.


## Menükorrektur 2026-11-02
- Lager-Kachel an data-gp-area=stock angebunden; Öffnen setzt aktiven Bereich, zeigt den übergeordneten Detailbereich und entfernt veraltete Artikelansicht-Klassen. Keine Datenbank-/Betriebsdatenänderung.
- Modul-URL aktualisiert, damit Browser die Korrektur laden.
- Chromium-Fixturetest erweitert: zunächst versteckter Detail-Elternbereich und aktive Artikelansicht, anschließend Klick auf Lager-Kachel, sichtbarer Bereich und aktiver Navigationsstatus. Produktive angemeldete Abnahme weiterhin offen; CI-Status über zugehörigen PR prüfen.

- Menükorrektur veröffentlicht über PR #63, Commit `f1252d7d3e618498eb251a05a77ee8b7ef8d48de`; ergänzende Isolation der sechs bestehenden Betriebsmenüs in `2ef58b0c5973d410575fe777111e5192c38f405e`. PR-CI 41501209063 bestätigt Syntax und Chromium-Interaktionen bei 1200/390 px, keine Produktionssitzung. Der verfügbare Live-Browser zeigt weiterhin die Anmeldung; keine Betriebsdaten geändert.

## Erneute Menüprüfung 2026-11-02
- Nutzer meldet weiterhin keinerlei sichtbares Öffnen. Fehler im tatsächlichen Nutzerbrowser bleibt offen.
- Test auf echte Cockpit-HTML, klassische Navigationsskripte und CSS erweitert; ausschließlich Auth-/Datenmodule mit schreibfreien Fixtures ersetzt. CI 41503425196 bestätigt Artikelanalyse→Lager und Übersicht→Lager bei 1200/390 px. Kein angemeldeter Produktionstest und kein Nachweis, dass der Nutzer dieselbe ausgelieferte Seitenversion sieht.
- Zur Eingrenzung fehlt die vollständige tatsächlich verwendete Browseradresse bzw. Information über Home-Bildschirm-App. Keine weitere spekulative Produktivkorrektur vorgenommen.


## Leerer Lagerbereich – Antwortreihenfolge 2026-11-02
- Nachgewiesener Codefehler: Eine veraltete Bestandsantwort führte trotz neuerer Renderanforderung `host.replaceChildren()` aus und konnte die bereits angezeigten Daten vollständig leeren. Veraltete Antworten werden jetzt ohne DOM-Änderung verworfen.
- Regressionsfall in echten Cockpit-HTML/Chromium-Fixtures: zweimal öffnen, zweite Antwort zuerst, erste Antwort zuletzt; Überschrift und Daten müssen erhalten bleiben. Test für 390/1200 px. Keine Betriebsdaten-/Schemaänderung; Judith unverändert.
- Versionskennung des Modulimports geändert; bestehende produktive Adresse und Anmeldung bleiben erhalten. Angemeldete Live-Abnahme weiterhin separat auszuweisen.

- Korrektur veröffentlicht: PR #65, Produktivcommit `7b0be58210db2e0a1a44ebb76a91de0e8f0ce136`; PR-CI [41513883313](https://github.com/MarkusRuess/gastropilot-app/actions/runs/41513883313) erfolgreich einschließlich Antwortreihenfolge-Test im echten Cockpit mit Fixtures bei 390/1200 px. Pages-Deployment [41514028606](https://github.com/MarkusRuess/gastropilot-app/actions/runs/41514028606) erfolgreich. Live-DOM unter der unveränderten Adresse https://markusruess.github.io/gastropilot-app/ enthält den aktualisierten Modulimport `20261102-response-race`. Verfügbarer Browser bleibt unangemeldet; keine Bestätigung der Bedienung im Nutzerkonto.


## Mobilnavigation – tatsächlicher Betriebsstart 2026-11-02
- Ursache nachgewiesen: `openBusiness()` ruft nach `refresh()` die alte Funktion `showMobilePanel('monthlyReference')` auf. Diese versieht alle anderen `section.card`, einschließlich des dynamisch angelegten Lagers, mit `mobileHidden`. CSS blendet sie mit `display:none!important` aus. Bisherige Cockpit-Fixtures ließen diesen letzten Startschritt aus.
- Lager-Öffner und Friedrich-only Stock-Route entfernen jetzt ausdrücklich `mobileHidden`. Bestehende Adresse, Login, Judith und Betriebsdaten unverändert.
- Chromium-Regression bildet den echten abschließenden Startfilter nach und prüft vor/nach Lagerklick sowohl Sichtbarkeit als auch Entfernung der Sperrklasse auf 390/1200 px. Veröffentlichung/CI-Nachweis folgt.

- Mobilkorrektur veröffentlicht über PR #66, Commit `46911a1222d5f1683010134a20d3af767b3bbac5`. PR-CI 41514685699 und Produktiv-CI 41514866374 erfolgreich: echter Cockpit-Startfilter inklusive `mobileHidden` bei 390/1200 px nachgebildet und Öffnung geprüft. Pages-Deployment 41514866366 erfolgreich. Unter der unveränderten produktiven Adresse nach erneutem Laden sowohl aktualisierten Modulimport `20261102-mobile-hidden` als auch Entfernen der Mobil-Sperrklasse im Live-DOM bestätigt. Kein angemeldeter Produktionstest möglich (verfügbarer Browser zeigt Anmeldung); keine Betriebsdatenänderung.

## 2026-11-03 – Friedrich Umsatztrennung, isolierter PR #67
- `index.html`: Bonit, Ausgangsrechnungen und Gesamtumsatz getrennte Brutto-Kacheln, Rechnungsliste nach Leistungsdatum im Tageskalender, Rechnungspositionen in der Top-30-Auswertung mit Herkunft.
- Keine Änderung von Supabase-Daten, Judith AI oder Berechtigungen.
- SQL-Abgleich November: Bonit 1.021,50 EUR; Rechnungen 115,20 EUR; Gesamt 1.136,70 EUR. Rechnung 17-2026: 36 Brötchen, 115,20 EUR, Leistung 05.11.
- Statische Code-Prüfung bestanden. Browser-E2E und CI für PR #67 noch nicht nachgewiesen; Live-Freigabe daher offen.

## 2026-11-03 – Einkaufspositionen und Wareneinsatzautomatik
- Friedrich-only Nachverarbeitung von drei bereits bezahlten Ausgaben: 24 Originalpositionen gespeichert und mit bestehenden Ausgaben verknüpft; keine erneuten Ausgaben. 16 bestätigte Lieferpositionen, sieben Betriebsbedarfspositionen ausgeschlossen, eine unlesbare Produktidentität offen. Originalverweise bleiben in privaten Belegdaten; keine Beleginhalte im Repository.
- Additive Migration `sql/friedrich-purchase-auto.sql`: nach bestehender Capture-Logik eindeutige Lebensmittel-/Getränkepositionen automatisch zuordnen/anlegen. Belegsumme, Netto/Steuer/Brutto, Einheit und Menge werden geprüft; keine unbekannten Flaschengrößen ergänzen. Vorhandene Konflikt-/Audit-/Dublettenlogik bleibt erhalten. Unbekannter Anfangsbestand bleibt unbekannt.
- `analyze-receipt`: zusätzliche Kategorie und Prüfkennzeichnung ausschließlich Friedrich; Judith-Normalisierung unverändert. Editoränderungen an Name/Menge sperren automatische Mengenübernahme bis zur Prüfung.
- Bestehende Lagerkachel erhält Wareneingänge, Lagerbewegungen und Wareneinsatz. Netto-Wareneinsatz = physisch gezählter bewerteter Anfangsbestand + bestätigte Wareneinkäufe − physisch gezählter bewerteter Endbestand. Bonit wird dabei nicht erneut abgezogen. Quote mit Nettoumsatz, Ziel 26 %, Abweichung in Prozentpunkten. Fehlende Monatsendzählungen, Netto-Bewertung, offene Positionen oder unbestätigte Einkaufsbelegvollständigkeit sperren tatsächlichen Wareneinsatz. Bereits laufender Monat bleibt vorläufig.
- Monatliche Belegvollständigkeit als separate Friedrich-only Eigentümerangabe (`gp_f_stock_period_checks`), keine automatische Behauptung vollständiger Einkaufsdaten. Bestehende Rezeptmengen und Lagerzustandsrechnung wiederverwendet.
- Vor Veröffentlichung: 30 Node-Tests und Inline-/Edge-Syntax bestanden. Neue Datenbankprüfungen für Zugang, Wiederholung, Konflikterhalt, Betriebsbedarf, Unsicherheit, Summenfehler und Judith-Isolation mit vollständigem Rollback bestanden. Weitere Veröffentlichungs-/Browsernachweise folgen unten.

### Veröffentlichungsnachweis Einkaufsautomatik – 2026-11-03
- PR [#68](https://github.com/MarkusRuess/gastropilot-app/pull/68) zusammengeführt; Produktivcommit `8eeedbbf3e7c93d80984a1af617e7fcdc7112df5`.
- PR-CI `41621206589` und Produktiv-CI `41622134222` erfolgreich: 30 Node-Tests, Inline-/Edge-Syntax und Chromium-Komponententests bei 1200/390 px, einschließlich neuer Wareneinsatz-/Wareneingangs-/Bewegungsansichten.
- Pages-Deployment `41622134265` erfolgreich. Bestehende Adresse https://markusruess.github.io/gastropilot-app/ im Live-Browser neu geladen; ausgelieferter Modulimport `20261103-auto` nachgewiesen. Browser zeigt Anmeldeformular; authentifizierter Upload und echte Bedienabnahme bleiben unbestätigt.
- Edge Function `analyze-receipt` Version 47 ACTIVE; deployter Quelltext exakt mit GitHub verglichen, vorhandene Authentifizierungsart beibehalten. Datenbankmigration aktiv; Sicherheitsadvisor meldet keine neue Periodenprüf-Tabelle als Problem.
- Produktiv lesend bestätigt: dieselben drei bezahlten Ausgaben mit unverändert 154,75 EUR, drei verknüpfte Belege, 24 Positionen; 16 bestätigte Zugänge (32 Stück, 3.600 g, 0,7 l), sieben ausgeschlossene Betriebsbedarfspositionen, eine unlesbare Position offen. Keine neue Zählung oder erfundener Anfangsbestand angelegt. Vorhandene Originalmengen unverändert; Bestände neuer Artikel bleiben ohne Zählung unbekannt.
- Neue und bestehende PostgreSQL-Assertions mit vollständigem Rollback bestanden. Bestehender Pfandtest an den ausdrücklich beauftragten Ausschlussstatus angepasst; Pfand bleibt ohne Lagerwirkung. Keine Testkonten oder Testdaten hinterlassen.
- Tatsächlicher Wareneinsatz ist aktuell mangels vollständiger bewerteter Grenzinventuren und bestätigter Belegvollständigkeit nicht nachgewiesen und bleibt gesperrt. Rechenformel und Warn-/Sperrfälle automatisch getestet.


## Mobile Schnellzählung – 2026-11-03
- Neuer Unterbereich ⚡ Schnellzählung in 📦 Lager & Inventur; vorhandener Friedrich-Artikelstamm, zuletzt gezählte Artikel oben, Suche, mehrere Mengen und ein gemeinsamer Speicherknopf. Leere Felder ignoriert; 0 ausdrücklich als Zählung gespeichert.
- Bestehende Tabelle gp_f_stock_counts: ein atomarer Batch, neue request_id je Artikel/Zählrunde; Wiederholungsversuch mit denselben IDs und ignoreDuplicates verhindert doppelte Ereignisse ohne alte Daten zu überschreiben. Keine neue Datenbank, Migration, KI-Aufrufe oder Berechtigungsänderungen.
- Gemeinsamer Zählzeitpunkt und optionale Tagesvollständigkeit; Einheiten ausdrücklich an jedem Eingabefeld. Letzte Menge/Datum aus Zählhistorie; Felder nach erfolgreichem Speichern geleert, Suche/DOM/Scrollposition bleiben erhalten. Fehler behalten Eingaben und IDs. Friedrich-Guard vor jedem Schreiben.
- Bestehende Einzelzählung und alle anderen Lagerfunktionen bleiben erhalten. Browserregression erweitert: Suche, letzte Artikel zuerst, ausgefüllte/ausgelassene Felder, explizite Null, Batchschreiben, erneute Zählung und unveränderte Position auf 390/1200 px. Keine echten Bestände für Tests verändert. Veröffentlichung und Liveprüfung folgen.

### Schnellzählung – Veröffentlichungsnachweis 2026-11-03
- PR #74 zusammengeführt, Produktivcommit `9848a863927c111f5901184d82cb34f24c164450`. PR-CI 41643117224 und Produktiv-CI 41643294350 erfolgreich: 30 bestehende Programmtests, Inline-/Edge-Syntax und erweiterte Chromium-Tests auf 390/1200 px inklusive Suche, letzte Zählung zuerst, Batch/Leerfelder/Null, neue Request-ID bei erneuter Zählung und Scrollposition. Erster Mobiltest fand einen Scrollversatz; vor Veröffentlichung durch Erhalt der Bereichshöhe und explizite Wiederherstellung korrigiert.
- Pages-Deployment 41643294425 erfolgreich. Unter https://markusruess.github.io/gastropilot-app/ tatsächlich ausgelieferten Schnellzählungs-Modulimport `20261103-quick-count` im Live-DOM bestätigt. Browser bleibt unangemeldet: kein echter produktiver Speicherklick und keine Bestandsänderung für Tests.
- Ablage: 📦 Lager & Inventur → ⚡ Schnellzählung. Keine neue App-Adresse, Datenbank, Migration, KI-Aufrufe oder zusätzliche Credits veranlasst. Bestands-/Zählhistorie bleibt erhalten.


## Lagermenü mit vier Kacheln – 2026-11-03
- Ausschließlich Bedienung geändert: vier helle Kacheln Schnellzählung, Lagerbestand, Einkauf & Verbrauch und Monatsinventur; jeweils ein Inhaltsbereich direkt unter der aktiven Kachel, erneuter Klick schließt. Dezent grüne Aktivmarkierung. Alle übrigen App-Bereiche unverändert.
- Schnellzählung startet mit höchstens zehn zuletzt tatsächlich gezählten vorhandenen Artikeln. Suche nutzt denselben geladenen Friedrich-Artikelstamm; Hinzufügen ergänzt die bestehende Liste ohne doppelte IDs. Name, letzte Menge/Zeit und leeres großes Mengenfeld nebeneinander. Gemeinsamer Speicherknopf umbenannt; vorhandener atomarer, duplikatsicherer Batch und Scrollschutz wiederverwendet.
- Artikelverwaltung in Lagerbestand integriert. Einkauf & Verbrauch bündelt bestehende Wareneingänge/Rechnungen, Bewegungen, Wareneinsatz, Zuordnungen und Rezepturen; bisherige Einkaufsplanung und Bonit-Artikelanalyse bleiben per direkten Buttons erreichbar. Keine neue Rezepturentwicklung.
- Monatsinventur zeigt zusätzliche rechnerische Monatsendvorschau mit bestehenden Mengen-/Preis-/Zählzeitdaten und PDF/CSV; Teilwert und unbekannte Mengen/Preise ausdrücklich markiert. Bestehende Monatsversionen/Exporte bleiben erhalten.
- Keine Datenbankmigration oder produktive Datenmutation. Vorher lesend: 53 Friedrich-Zählungen; Fingerabdruck 725a5e970ea01b564e568965e76d4465. Neue Zählung schreibt ausschließlich gp_f_stock_counts, keine Wareneingänge. CI/Veröffentlichung folgen.

### Vier-Kachel-Menü – Veröffentlichungsnachweis 2026-11-03
- PR #75 zusammengeführt; Produktivcommit `e75d3d33d806deb737b2241e69b876678ac1c1cb`. PR-CI 41648288961 erfolgreich: 30 bestehende Programmtests, Syntax sowie Chromium-Interaktionen mit Fixtures auf 390/1200 px. Testdaten enthalten mehr als zehn gezählte Artikel; genau zehn initiale Zeilen, Suche/Hinzufügen ohne doppelte IDs, Leerfelder/Null, gemeinsamer Batch, erneute Zählung, Scrollposition, vier Kacheln mit Schließen/Umschalten, bestehende Einkaufsansichten und Monats-PDF geprüft.
- Pages-Deployment 41648516577 erfolgreich. Unter der unveränderten produktiven Adresse tatsächlich ausgelieferten Modulimport `20261103-four-tiles` im Live-DOM bestätigt. Browser zeigt Anmeldung: keine authentifizierte Bedien-/Speicherabnahme und keine echten Bestände für Tests geändert.
- Alle 53 bisherigen Zählereignisse unverändert: identischer Vorher-/Nachher-Fingerabdruck `725a5e970ea01b564e568965e76d4465`. Keine Schema-/Berechtigungsänderung, zweite Artikeldatenbank oder KI-Aufrufe.



## Lagerbestand: tatsächliche Zählung sichtbar und volle Flaschen – 2026-11-03
- Bestandsanzeige trennt die unveränderte letzte tatsächliche Zählmenge und ihren Netto-Warenwert vom unsicheren Rechenbestand/Bonit-Verbrauch. Tageszeit-/Quellkonflikte verdecken keine gespeicherte Zählmenge mehr. Ohne tatsächliche Zählung oder Preis bleibt der jeweilige Wert unbekannt; bestätigte Null bleibt sichtbar.
- Bestehende Einzel- und Schnellzählung: bei Flaschen ganze volle Flaschen eingeben. Ausschließlich neue Eingaben werden mit belegter Gebindegröße einmal in die bestehende Lagereinheit umgerechnet. Gespeicherte Liter bleiben unverändert. Mengen/Einheit/Größe der neuen Eingabe werden zusätzlich im Zählereignis protokolliert. Bestehender Batch/Leerfelder/Null/Scrollschutz bleibt erhalten; keine Wareneingänge aus Zählungen.
- Gebinde aus bestehendem Artikelprofil und verknüpften Rechnungspositionen. Aperol-Rechnungen enthalten 0,7 und 1 l: keine Vorauswahl; kurze Größenauswahl nur aus tatsächlich vorhandenen Rechnungsgrößen. Fehlende Größen sperren die Flaschenumrechnung. Keine Preise aus ungeprüften Belegen übernommen.
- `sql/friedrich-stock-pack-correction.sql`: gezielte, wiederholbare Korrektur der vorhandenen 0,75-l-Flaschenprofile (Einkaufsgebinde und Umrechnungsfaktor des ursprünglichen Flaschenpreises). Hauswein Weißwein HOFER ausdrücklich 1-l-Flasche. Keine bestehenden Artikel, Mengen, Zählereignisse, Einkaufs-/Bonit-Daten oder Monatsstände geändert; keine neue Tabelle, kein neues Menü, keine Rezepturentwicklung oder Berechtigungsänderung.
- Vorher: 53 Zählereignisse, Prüfsumme `725a5e970ea01b564e568965e76d4465`. Metadatenkorrektur mit PostgreSQL-Assertions und vollständigem ROLLBACK geprüft: gespeicherte 7,5 l bleiben 7,5 l; Netto-Flaschenpreis korrekt je Liter; HOFER 1 l; Zählhistorie identisch.
- Lokal: 34 Programmtests und Inline-/Edge-Syntax bestanden. Lokaler Chromium fehlt; Browsernachweis erfolgt in GitHub-CI vor Veröffentlichung. Angemeldete Live-Bedienung noch nicht geprüft. Veröffentlichungs- und Nachher-Nachweise folgen.

### Zählbestand – Veröffentlichung und Datenerhalt 2026-11-03
- PR #76 zusammengeführt; Produktivcommit `0fbf5eb7f587dc87819ea72a48dd717a9bc13c8e`. Abschließende PR-CI 41651665527 und Produktiv-CI 41651937397 erfolgreich: 34 Programmtests, Inline-/Edge-Syntax und reale Chromium-Fixtureinteraktionen auf 390/1200 px. Vorherige PR-CI 41651263251 ebenfalls erfolgreich. Geprüft: gespeicherte Liter bleiben unverändert; tatsächliche Zählmenge samt Wert trotz unbekanntem Rechenbestand sichtbar; mehrere volle Flaschen einmalig umgerechnet; Aperol-Größenauswahl aus vorhandenen Rechnungen; Null/Leerfelder/Batch/Wiederholungszählung/Scrollposition und bisherige Menüs.
- Pages-Deployment 41651937459 erfolgreich. Bestehende produktive Adresse https://markusruess.github.io/gastropilot-app/ neu geladen; ausgelieferten Modulimport `20261103-counted` im Live-DOM bestätigt. Verfügbarer Browser zeigt Anmeldeformular: **keine angemeldete Live-Bedienung und kein produktiver Test-Speicherklick**.
- Metadatenkorrektur in Supabase angewendet, durch gezielte PostgreSQL-Assertions zuvor mit Rollback geprüft. Zusätzlich vorhandene eindeutig bestätigte 0,7-l-Flaschenangabe für Averna aus bestehender Einkaufsposition in dessen Gebindeprofil übernommen; separat mit Rollback geprüft. Keine Rechnung erneut ausgelesen oder neue Lieferung erzeugt; keine KI-Aufrufe.
- Nachher weiterhin **53 Zählereignisse**, unveränderte Prüfsumme `725a5e970ea01b564e568965e76d4465`. Auch ursprünglicher Artikelstamm und sämtliche Lager-Rechnungspositionen haben identische Vorher-/Nachher-Prüfsummen. Änderungen ausschließlich an belegten Gebindeprofilen, nicht an Zählmengen, alten Preisen, Einkaufs-/Bonit-Daten oder Monatsständen. Judith/Judith AI unverändert.
- Fehlende Netto-Preise und ungesicherte Bonit-Rechenbestände bleiben ausdrücklich unbekannt. Die Anzeige der letzten tatsächlichen Zählung ist keine Behauptung eines aktuellen vollständigen Rechenbestands.

## 2026-11-04 – Vollständige mehrseitige BONit-Auslesung
- Fehler nachgewiesen: Artikel-Nachverarbeitung prüfte Z-Nummern mit doppelt maskiertem Regex und lehnte normale Z-Nummern ab. Korrigiert. Erst-Erkennung erzeugt für Friedrich keine ungeprüften Artikel-Archivzeilen mehr; Kandidaten bleiben erhalten und der bestehende Nachverarbeitungsschritt übernimmt erst abgeglichene Einzelartikel.
- Friedrich-spezifische Originalnachverarbeitung verlangt für jedes gespeicherte Foto Seitenbericht, Zeilenzahl und eindeutigen Quellenindex. Gedruckte Seitenfolge, Fortsetzung, unlesbare Zeilen, Gratiszeilen, Einzelpreis × Menge, Artikelsumme, Tagesdatum/Z, Zahlungsarten/Bonanzahlen und gedruckte Steuergruppen werden kontrolliert. Steuerdifferenzen der Artikel werden gesondert gemeldet; gedruckte Summen bleiben maßgeblich. Rücknahmenblock wird separat erhalten und nicht erneut abgezogen.
- Neue SECURITY-INVOKER-RPC `gp_f_import_bonit_articles`: bestehende Mitgliedschaft/RLS, Friedrich-only, Transaktionssperre je Geschäftstag, atomarer Artikelbatch; Wiederholung unverändert ohne neue Zeilen. Gleiche Anzahl/Summe mit abweichender Artikelidentität wird abgewiesen; keine überschriebenen Betriebsdaten.
- Vorhandene Originalpfade wiederverwendet; erfolgreiche Neuauslesung mit Fingerabdruck aller Fotos zwischengespeichert, kein weiterer KI-Aufruf bei identischen Quellen. Keine neue App-Adresse, Testkonten oder Fotoarchivierung eingeführt. Judith-Ablauf und Judith AI unverändert.
- Vorliegender dreiseitiger Abschluss erneut visuell kontrolliert; sämtliche 73 Originalzeilen vorhanden und Gesamtsumme/Paginationszuordnung abgeglichen. Steuerdetail-Prüfhinweis bleibt; keine geschätzte Steuerkorrektur. Abschlusssummen und Artikelumsätze unverändert.
- 53 Programmtests und Inline-/Edge-Syntax bestanden; Datenbanktests mit bestehendem autorisierten Nutzer und anschließendem vollständigem Rollback: Import, Wiederholung, Identitätsabweichung trotz gleicher Summe, Summenfehler, unberechtigter Nutzer. Veröffentlichung/Live-Nachweise folgen.

### Mehrseitige BONit-Fotos – Veröffentlichungsnachweis 2026-11-04
- PR [#77](https://github.com/MarkusRuess/gastropilot-app/pull/77) zusammengeführt; Produktivcommit `52a7d93f9326f0bdbef70b49ed857d40859a7896`. PR-CI `41822558159` und Produktiv-CI `41822713786` erfolgreich: 53 Programmtests, Syntax und bestehende Chromium-Fixturetests bei 390/1200 px.
- Pages-Deployment `41822713777` erfolgreich. Bestehende produktive Adresse: aktualisierte `upload.html` und `friedrich-pages.mjs` tatsächlich mit HTTP 200 ausgeliefert; neue Prüfhinweis-Anzeige und Validierungsmodul im Live-Quelltext bestätigt.
- Supabase-Migration `friedrich_bonit_all_pages_v1` aktiv; neue RPC ausschließlich SECURITY INVOKER, bestehende Mitgliedschaft/RLS, anonymer Aufruf gesperrt. Neue SQL-Tests vor Veröffentlichung mit vollständigem ROLLBACK bestanden; kein Testbeleg verblieben. Sicherheitsadvisor meldet keine neue RPC-Warnung.
- `analyze-receipt` Version 48 ACTIVE. Beide deployten Quelldateien exakt mit GitHub verglichen; bisherige Authentifizierung unverändert, echter anonymer POST liefert HTTP 401.
- Alle drei vorhandenen Originalfotos visuell erneut geprüft. 73 gespeicherte Originalzeilen inklusive kostenloser/mehrfacher Artikelzeilen durch neue Validierung geprüft: Seiten 1/2 mit 26/47 Zeilen, dritte Quelle mit Summen und Zahlungsarten; keine Vollständigkeitsfehler, nur Steuerdetailwarnungen. Kein neuer Upload oder erneute KI-Auslesung dieses vorhandenen Abschlusses nötig.
- Eindeutig falsch transkribierter Steuersatz der Position 3039 anhand Original korrigiert; vorheriger Satz in `original_tax_correction` erhalten. Verbleibende Differenz zwischen Artikelsteuergruppen und gedruckten Steuergruppen zur Prüfung markiert. Keine erfundene Zuordnung, Änderung der Tages-/Netto-/Zahlungs-/Artikelumsatzsummen oder Doppelbuchung. Produktiv bestätigt: genau ein Abschluss und 73 Artikelzeilen zum geprüften Z, Artikelsumme identisch zum Brutto.
- **Nicht bestätigt:** vollständiger angemeldeter Kamera-/Mehrfoto-Upload mit realem Mitarbeiterkonto. Keine Testkonten oder Produktionsänderungen für Browser-Fixtures. Technische Veröffentlichung und anonymer Zugriffsschutz sind bestätigt, echte authentifizierte Bedienabnahme bleibt offen.

## 2026-11-04 – Abschließender Originalabgleich Z 1855
- Erneut lesend bestätigt: genau ein Abschluss, 73 Artikelzeilen (69 unterschiedliche Nummern); alle Nummern und Einzelpreise vorhanden, keine Multiplikationsfehler. Bezahlte, kostenlose und abweichende Preiszeilen bleiben separat; keine erneute Umsatz-/Artikelbuchung.
- Toast 309 ist nach Original mit 10 % gespeichert. Alle drei Fotos erneut geprüft, insbesondere vergrößerter Originalausschnitt der Positionen 3039/3040. Gedruckte Artikelsteuersätze ergeben eine andere Steueraufteilung als der gedruckte Steuer-/Artikelgruppenblock. Der verbleibende Unterschied entspricht der Gruppe Sonstige Erlöse 10 % und der Differenz der Weinpositionssumme zur gedruckten Weingruppe. Keine einzelne Position darf daraus geraten werden; Original-Steuersummen erhalten, `vat_summary_status=source_conflict`.
- Echte gespeicherte Artikel durch die unveränderte produktive `articleFamily`/`groupTopArticles`-Implementierung gerechnet: vollständige Umsatzsumme erhalten, Top-30-Rangliste erzeugbar, alle Mengen × Einzelpreise korrekt. Gemeinsame Monatsabfrage und Lager-Verkaufsview enthalten sämtliche Zeilen; keine ergänzende Programmänderung erforderlich.
- Bonanzahlen anhand Original als 90 bezahlt plus zwei kostenlose Belege nachgewiesen; ergänzende bestätigte Metadaten gespeichert. Abschlussdatum, Betrag, Zahlungsarten, Nettoumsatz und Originalartikelbeträge unverändert. Keine neuen Originaldateien in App-Speicher oder Repository hochgeladen; vorhandene Originale nicht gelöscht.
- Einkaufsplanung: 25 Zeilen mit vorhandenen Regeln, 48 ohne Rezeptzuordnung. Zusätzliche nachgewiesene Prüfhinweise: Kaffee-Regel 1400 steht aktuell auf 0,8 g trotz vereinbarter 8 g; mehrere ältere Flaschenregeln verwenden trotz Lager-Einheit Liter noch Flaschenfaktoren. Im Rahmen dieses Abschlussabgleichs keine bestehenden Rezepturen oder Bestände ungeprüft überschrieben. Entsprechend **keine vollständige Freigabe der Einkaufs-/Verbrauchsberechnung**.
- Datenbank-Assertions zu Anzahl und Summe bestanden. Tatsächliche bestätigte Prüfdaten in `bonit_daily_closings.raw_data.z1855_final_check`; Steuerkonflikt und Rezeptgrenzen bleiben sichtbar dokumentiert. Diese Daten-/Metadatenübernahme ist unmittelbar produktiv; bestehende veröffentlichte App wird verwendet. Authentifizierte Live-Bedienung weiterhin nicht nachgewiesen.

## 2026-11-04 – Gezielte Abschlusskontrolle: Kaffee und Weinregeln Z 1855
- Keine neue Entwicklung/Neuauslesung: vorhandene Stammdaten, `gp_ingredient_links`, Regeln und Artikelquellen gezielt geprüft. Kein KI-Aufruf. QA-Branch lesend berücksichtigt, nicht übernommen.
- SQL-Datenkorrektur `sql/friedrich-z1855-reconcile.sql`: Espresso 1400 von 0,8 g auf ausdrücklich vereinbarte 8 g berichtigt; doppelt 16 g und Dose 1.500 g bestätigt. Elf in Z 1855 verwendete alte Flaschenfraktionen anhand vorhandener 0,75-l-Profile einmalig auf Liter berichtigt. Keine vorhandenen Liter-Zählmengen umgerechnet.
- Sechs belegte Regelkomponenten ergänzt, ausschließlich bestehende Lagerartikel: Soda 1512/1513; Pfaffl-Flasche 3049; Neumeister-Flasche 4014; Sommerspritzer 3057 nur vorhandener Weinanteil; Crodino 1519 zusätzlich vorhandener Betreiber-Sodaanteil. Fünf ursprünglich ganz unzugeordnete Artikelnummern/sechs Zeilen erhalten somit eine belegte (teils unvollständige) Grundlage.
- Vorherige zwölf Regelstände und sechs Neuanlagen im privaten Abschluss-Audit `raw_data.z1855_rule_corrections` erhalten. Wiederholung erzeugt keine weiteren Regeln und überschreibt den Audit nicht.
- Ursprüngliche 48 Zeilen betreffen 45 Nummern; vollständige Liste und Status in [PRUEFUNG_Z1855_REZEPTZUORDNUNGEN.md](PRUEFUNG_Z1855_REZEPTZUORDNUNGEN.md). Nachher 42 Zeilen / 40 Nummern vollständig ohne Zuordnung; Sommerspritzer zusätzlich nur teilweise hinterlegt. Nicht belegte Lebensmittelmengen, Getränkemarken und Cocktailkomponenten bleiben offen.
- Gezielt mit vollständigem Rollback getestet, dann produktiv ausgeführt und Wiederholung erneut mit Rollback geprüft: 12 Korrekturen + 6 Ergänzungen; Wiederholung 0 + 0. Z1855-Referenzverbrauch: Kaffee 504 g einschließlich Gratisbezügen; Prosecco 1 l; Freixenet 3 l. Hauswein HOFER 1-l-Gebinde unverändert bestätigt.
- Vorher-/Nachher-Fingerabdrücke identisch für sämtliche gespeicherten Inventurartikel, Zählungen, Monatsstände, Friedrich-Einzelartikel sowie sämtliche Abschlussbeträge/Zahlungsarten/Bonanzahlen. Weiterhin genau 73 Z1855-Zeilen; keine neue Kosten-/Umsatz-/Lieferbuchung. Korrektur betrifft nur Regeln und Prüfmetadaten.
- Steuerkonflikt unverändert: gedruckte Einzelsteuersätze und Summenblock widersprechen sich; Toast 10 % korrekt. Ohne zusätzliche eindeutige Bonit-Transaktionsgrundlage keine Artikelumsteuerung. Keine gesetzlichen Steuerannahmen aus Produktnamen.
- Datenkorrektur ist direkt in der bestehenden produktiven Supabase wirksam; vorhandene `gp_f_stock_state`-/Einkaufsansicht verwendet diese Regeln. Keine Änderung an App-Code, Links, Anmeldungen, Berechtigungen, Judith oder Judith AI nötig. Authentifizierte Live-Browserbedienung bleibt unbestätigt; tatsächliche DB-Regeln und Verbrauchswerte lesend geprüft.

### Nachweis gezielter Regelkorrekturen 2026-11-04
- PR [#78](https://github.com/MarkusRuess/gastropilot-app/pull/78) zusammengeführt; Commit `f00a035bc2f0cdd00f4a0d451e1e027681a444f7`. SQL und vollständige Zuordnungsliste auf GitHub gespeichert; keine neue App-Programmversion erforderlich, da bestehende Ansichten dieselben DB-Regeln verwenden.
- Produktiv geprüft: 18 Auditpositionen (12 vorherige Regeln + 6 Neuanlagen), weiterhin 42 Zeilen ganz ohne Regel. `gp_f_stock_state()` tatsächlich auf produktiver Datenbank aufgerufen: Illy wird in Gramm mit 1500-g-Gebinde geführt; HOFER-Hauswein in Litern mit 1-l-Gebinde. Tatsächliche Zählwerte bleiben unverändert, rechnerische Bestandsunsicherheiten werden weiterhin ausgewiesen.
- Datenkorrektur vorab mit Rücknahme getestet; wiederholte Anwendung ebenfalls mit Rücknahme geprüft: 0 Korrekturen/0 Neuanlagen. Keine zusätzliche KI, keine neuen Testkonten oder Vollprüfung der unveränderten Anwendung. Der bestehende Live-Link bleibt erhalten; angemeldete Browserbedienung wurde nicht bestätigt.


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
