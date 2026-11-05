# GastroPilot – gemeinsame Projektübersicht

**Stand:** 2026-11-02 · **Status:** dokumentierte Bestandsaufnahme im Entwicklungsbranch; keine Produktionsfreigabe.  
**Repository (nachgewiesen):** `MarkusRuess/gastropilot-app` (Standardbranch `main`, Dokumentations-/QA-Branch `qa/automated-checks-20261102`).  
**Supabase (nachgewiesen):** `gastropilot`, Projekt-ID `sjnwfwcpgwsavygewwzb`, Region `eu-west-1`, PostgreSQL 17.11, Status `ACTIVE_HEALTHY`.

## 1. Vier ChatGPT-Projekte und Zuständigkeiten

| Projekt | Zuständigkeit | Verbindlicher Projektstand |
|---|---|---|
| **GastroPilot Zentrale** | Gemeinsame Startseite, Navigation, Gesamtumsatz, zentrale UI, Infrastruktur, Sicherheit, projektübergreifende Tests und Schnittstellenkontrolle | [PROJEKTSTAND_ZENTRALE.md](PROJEKTSTAND_ZENTRALE.md) |
| **GastroPilot Friedrich** | Bonit-Kassa, Einzelartikel/Top 30, Umsatz, Einkauf, Lager, Inventur, Rezepturen, Kosten und Auswertungen **nur** Brot & Wasser RA GmbH | [PROJEKTSTAND_FRIEDRICH.md](PROJEKTSTAND_FRIEDRICH.md) |
| **GastroPilot Judith** | Umsatz, Tagesabschlüsse, Beleg-/Rechnungsimport, Banktransaktionen, Zahlungserkennung, Kosten und Controlling **nur** J.W. GmbH | [PROJEKTSTAND_JUDITH.md](PROJEKTSTAND_JUDITH.md) |
| **Judith AI** | Kunden, Tortenanfragen/-aufträge, Kalender, Backstube, Mitarbeiterzugänge, Abholstatus und **lesende** Kundenzahlungsanzeige | [PROJEKTSTAND_JUDITH_AI.md](PROJEKTSTAND_JUDITH_AI.md) |

**ChatGPT-Projekte** sind organisatorische Arbeitsräume, keine automatisch miteinander synchronisierten Software-Repositories. Verbindliche gemeinsame Referenz ist diese Datei samt den vier Projektständen im GitHub-Branch.

## 2. Tatsächliche GitHub-Repositories und Code

Die GitHub-Repositoriesuche im erreichbaren Benutzerkonto `MarkusRuess` lieferte **ein Repository**: `MarkusRuess/gastropilot-app`. Ein separates Repository für Judith AI oder einzelne GastroPilot-Betriebe wurde **nicht nachgewiesen**; außerhalb der erreichbaren Kontoberechtigungen können weitere Repositories existieren.

- `index.html`: gemeinsame GastroPilot-Weboberfläche für Friedrich und Judith; zentrale und betriebsspezifische Logik muss bei Änderungen getrennt getestet werden.
- `judith-ai/postfach.html`: separate Judith-AI-Oberfläche **im selben Repository**.
- `QUALITAETSSICHERUNG.md`: Sicherheits- und QA-Befunde, Testgrenzen.
- `scripts/qa-static.mjs` und `.github/workflows/qa-gastropilot.yml`: statische QA-Prüfungen im Entwicklungsbranch.
- QA-PR #46 ist offen und nicht zusammengeführt; erfolgreicher GitHub-Actions-Lauf #12 belegt **nur statische Checks**, keine vollständige End-to-End-Abnahme.
- Vollständige Repository-Inventur und exakte produktive Deployment-Version stehen noch aus.

## 3. Supabase und Datenverbindungen

Bei der aktuellen Projektauflistung wurde **ein erreichbares Supabase-Projekt** gefunden: `gastropilot` (`sjnwfwcpgwsavygewwzb`). Die vier Anwendungen/Arbeitsbereiche nutzen damit nach gegenwärtigem Befund **eine gemeinsame Datenbank**, keine vier isolierten Datenbanken.

| Bereich | Nachgewiesene relevante Tabellen / Funktionen |
|---|---|
| Mandanten und Berechtigungen | `businesses`, `business_members`, RLS-Policies und `business_id` |
| Friedrich | `bonit_daily_closings`, `bonit_article_sales`, `gp_inventory_items`, `gp_inventory_snapshots`, `documents`, `expenses` |
| Judith Finanzen | `bank_transactions`, `bank_invoice_matches`, `sales_invoices`, `documents`, `expenses`, `cash_reports`, `gp_ledger_monthly` |
| Judith AI | `judith_ai_access`, `judith_ai_customers`, `judith_ai_inquiries`, `judith_ai_prospects`, weitere `judith_ai_*`-Tabellen sowie Schema `judith_ai` |
| Schnittstellen | Supabase Edge Function `judith-ai-payment-inflows` (zuvor als aktive Version 3 geprüft); weitere aktive Edge Functions für Bonit, Belegerkennung und Judith AI |

Tabellen- und Funktionsnamen sind keine Garantie für erfolgreiche Laufzeitabläufe. RLS-Policies schützen nur, wenn sämtliche relevanten Lese-, Schreib-, RPC- und Edge-Function-Pfade korrekt autorisieren.

## 4. GastroPilot Judith ↔ Judith AI

```text
Judith: Bank-PDF / Beleg
  → GastroPilot-Import und Rechnungsnummernerkennung
  → bank_transactions [business_id = Judith]
  → judith-ai-payment-inflows [JWT + aktive Judith-AI-Zugangsprüfung]
  → Judith AI: Zahlungseingänge (Datum, Name, Betrag, Rechnungsnummer)
```

- Anzeige in Judith AI ist **read-only**; keine Ausgänge, Kontostände, Prüfen-/Verbuchen-Schaltflächen und **keine automatische ETRON-Verbuchung**.
- Monatsfilter und Kundenzahlungsfilter sind implementiert bzw. teilweise geprüft; Anzeige Juli–Oktober wurde historisch im Betrieb bestätigt, jedoch nicht aktuell vollständig E2E reproduziert.
- Bankimport: `UNIQUE(business_id,source_hash)` vorhanden; gleiche Buchung mit anderem Hash bleibt ein mögliches Dublettenrisiko.
- Zuordnung von Rechnungsnummern zu Kunden/Aufträgen und semantische Dublettenvermeidung sind **nicht vollständig verifiziert**.
- Schnittstelle niemals ohne konkreten Auftrag ändern; nach Änderungen **beide** betroffenen Projektstände und diese Übersicht aktualisieren.

## 5. Entwicklungsstand und offene Aufgaben

| Bereich | Stand | Offene Aufgabe |
|---|---|---|
| Gemeinsames Dashboard | Code vorhanden | Gesamtumsatz, Quellen und Doppelzählung E2E prüfen |
| Friedrich Bonit und Lager | Tabellen und Datensätze vorhanden | Einzelartikel-Vollständigkeit, Lagerwert, Monatsinventur/Export testen |
| Judith Bank/PDF | Daten vorhanden; Importentwicklung dokumentiert | Wiederholungsimport, Rechnungsnummern, Dubletten und Monatszuordnung testen |
| Judith AI | Oberfläche, Tabellen und Edge Functions vorhanden | Auftrag→Kalender→Backstube→Abholung und Mitarbeiterrechte testen |
| Judith-Zahlungsanzeige | Schnittstellenaufruf und Edge Function vorhanden | Kundenzahlungsfilter, Berechtigungen, Duplikate, mobile Ansicht E2E prüfen |
| Mandantentrennung | RLS-Policies vorhanden; eingeschränkte read-only Tests | Negative API-/Schreibtests mit getrennten Testkonten durchführen |
| Supabase Security Advisor | 23 Tabellen mit RLS ohne Policy gemeldet | Erreichbarkeit/Notwendigkeit einzeln bewerten; nicht pauschal als Datenleck einstufen |
| Datensicherung | Backup/Restore nicht nachgewiesen | Wiederherstellbarkeit sicher und ohne produktiven Eingriff klären |
| QA | Statische Checks erfolgreich | Browser-/Mobil-/Integrationstests ergänzen |

## 6. Verbindliche Trennungs- und Entwicklungsregeln

1. **Friedrich und Judith strikt getrennt:** sämtliche Lese- und Schreiboperationen über autorisierte `business_id`; Frontend-Filter allein reichen nicht. Keine Betriebsdaten in fremden Dashboards, Auswertungen oder Schnittstellen.
2. **Zentrale koordiniert, verändert aber keine Fachmodule ohne Auftrag.** Judith AI bleibt separat. Gemeinsame Dateien nur nach Auswirkungsprüfung auf beide Betriebe ändern.
3. **Keine Löschung, Überschreibung, Produktivmigration, Rollen-/RLS-Änderung, Deployment oder Merge ohne passende ausdrückliche Freigabe.**
4. **Nur Entwicklungsbranch:** Änderungen erst nach Code-/Schema-/Schnittstellenprüfung; Tests vor Merge; keine Betriebsdaten für Tests manipulieren.
5. **Dokumentationspflicht:** Nach jeder künftigen Änderung die **betroffenen** `PROJEKTSTAND_*.md` mit Datum, Commit, Dateien, Tests und offenen Risiken aktualisieren; diese Gesamtübersicht aktualisieren, wenn Architektur, Repository, Schnittstelle, Zuständigkeit oder projektübergreifende Regeln betroffen sind.
6. Nachweise präzise kennzeichnen: **geplant / Code vorhanden / Daten vorhanden / getestet / produktiv bestätigt**. Keine unbelegten Erfolgsmeldungen.
7. Zugangsdaten, Kundendaten, Bankdaten und vertrauliche Einzelvorgänge nicht in GitHub-Dokumentationen veröffentlichen.

## 7. Nachweise und weitere Referenzen

- [Zentrale](PROJEKTSTAND_ZENTRALE.md)
- [Friedrich](PROJEKTSTAND_FRIEDRICH.md)
- [Judith](PROJEKTSTAND_JUDITH.md)
- [Judith AI](PROJEKTSTAND_JUDITH_AI.md)
- [Qualitätssicherung](QUALITAETSSICHERUNG.md)

**2026-11-02:** Gemeinsame Übersicht ausschließlich im Entwicklungsbranch erstellt. GitHub-Repositoriesuche, Supabase-Projektliste, aktive Edge-Function-Liste und vier Projektstanddateien lesend geprüft. Keine Änderungen an Anwendung, produktiven Daten oder Berechtigungen.


## 2026-11-05 – Personaloberfläche beider Betriebe (QA)
- `index.html` QA-Commit `eee8662`: Personal-Navigation lädt beim ersten Klick eine Monatsauswahl (Pfeile und Monat/Jahr) und Mitarbeiterhistorie. Ausschließlich `personnel_costs` und `employee_profiles` des gewählten Betriebs; alle gespeicherten Monate, neuester zuerst. Brutto, vorhandene Nettobezüge, Dienstgeberkosten und Summe werden ohne Vormonatsersatz angezeigt. Fehlende Werte bleiben offen; gleiche Namen sind ohne Mitarbeiter-ID nicht sicher unterscheidbar.
- Begonnene Judith-Uploadkorrektur `193e3284` im QA-Branch vorhanden. Drei Oktober-Originale im privaten Bucket nachgewiesen, aber PDF-Inhalte und vollständige Lohnabstimmung weiterhin nicht geprüft. **Kein belastbarer Oktober-Personalaufwand und keine Personalquote**. Umsatz/Quote in der neuen Ansicht noch nicht angebunden; Import und Duplikatsicherung nicht vollständig fertiggestellt.
- Nur GitHub-QA-Branch geändert; keine Datenbankmigration, kein Deployment, keine bestätigten automatischen Browser-/End-to-End-Tests oder Liveprüfung. Friedrich/Judith-Mandantentrennung im Code, negative RLS-Tests offen. **Nicht produktionsreif.**


## 2026-11-05 – tägliche Personalquote (QA, noch nicht integriert)
- `business-overview.js` Commit `8f4727f`: gemeinsame reine Berechnungsfunktion `calculateDailyPersonnelQuote` für Ist/Plan, 35%-Ziel und gesicherten Nettoumsatz; ohne Tagesabschlussdeckung keine Schätzung, ohne vollständigen Monatsabschluss keine Ist-Quote, kein Bruttoumsatz als Nenner.
- **Noch nicht fertig:** Funktion ist noch nicht an Startdashboard, Judith- und Friedrich-Dashboard angeschlossen. Zuverlässige Tagesabschluss-Vollständigkeitsprüfung (Öffnungstage, heute), vollständiger Personalreferenzmonat, Monats-Ist-Abgleich, Tests, Deployment und Liveprüfung fehlen. Keine produktive Änderung; keine Daten verändert. Nicht als fertig melden.
