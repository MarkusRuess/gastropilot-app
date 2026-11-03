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
