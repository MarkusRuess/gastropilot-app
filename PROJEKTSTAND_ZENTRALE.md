# PROJEKTSTAND – GASTROPILOT ZENTRALE

**Stand:** 2026-11-02  
**Repository:** MarkusRuess/gastropilot-app  
**Supabase:** gastropilot (Projekt-ID `sjnwfwcpgwsavygewwzb`, Region eu-west-1, PostgreSQL 17)  
**Prüfmodus:** GitHub und Supabase nur lesend; ausschließlich diese Dokumentation wird neu erstellt. Keine Änderungen an Programmfunktionen oder Betriebsdaten.

## 1. Architektur und Zuständigkeit
- Gemeinsame Webanwendung: `index.html` (direkt auf GitHub gelesen; umfangreiche HTML-/CSS-/JavaScript-Datei mit Supabase-JS-v2-Client, Betriebsnavigation, Dashboard, Upload und Auswertungen).
- Eigenständige Judith-AI-Weboberfläche: `judith-ai/postfach.html` (direkt gelesen; Supabase-Client und Aufrufe von Edge Functions). Keine Änderung an Judith AI.
- Gemeinsame Supabase-Instanz mit zwei Zeilen in `businesses`; `business_members` enthält Benutzer-/Betriebsrollen. Zahlreiche Fachtabellen tragen `business_id`. Physisch gemeinsame Datenbank ist **keine** vollständige technische Mandantenisolation.
- Relevante getrennte Projektstände: `PROJEKTSTAND_FRIEDRICH.md`, `PROJEKTSTAND_JUDITH.md` (beide am 02.11.2026 gelesen).
- Vollständiger Repository-Dateibaum, produktive Deployment-Version und alle Edge-Function-Implementierungen wurden nicht vollständig geprüft.

## 2. Statusmatrix
| Funktion | Direkt belegter Befund | Status |
| --- | --- | --- |
| Startseite / Betriebsnavigation | `index.html` verwendet `authorizedBusinesses`, `business_members` und `BID` für die Auswahl | Implementiert; Browser-Abnahme offen |
| Gemeinsames Dashboard | Gemeinsame HTML-/JS-Oberfläche vorhanden | Implementiert; Live- und Mobiltest offen |
| Gesamtumsatz beider Betriebe | Code in `index.html` liest `gp_ledger_monthly` über mehrere berechtigte Betriebs-IDs und filtert verifizierte Kennzahlen | Implementiert; korrekte Summierung, Quellen/Vollständigkeit und Doppelzählung offen |
| Mandantentrennung | Viele Lese-/Schreibabfragen mit `.eq('business_id',BID)`; RLS für `businesses`, `business_members`, `bank_transactions` und `gp_ledger_monthly` mit Policies nachgewiesen | Teilweise implementiert; vollständiger Negativtest aller Endpunkte offen |
| Banktransaktionen Judith | `bank_transactions` enthält laut Judith-Projektstand 247 Judith-Buchungen; `UNIQUE(business_id,source_hash)` dokumentiert | Daten vorhanden / DB-Duplikatschutz; semantische Dubletten und Laufzeittest offen |
| Judith-AI-Zahlungseingänge | `judith-ai/postfach.html` ruft `judith-ai-payment-inflows?month=...` mit Session-Token auf | Schnittstellenaufruf implementiert; Edge-Function-Filter/Antwort/Live-Test offen |
| Kunden-/Auftrags-/Zahlungsanalysen | Judith-AI-Kunden-/Anfragetabellen und GastroPilot-Zahlungstabellen vorhanden | Datenmodell-Basis; belastbare Zuordnung/Join-Keys und berechtigter Zugriff noch zu prüfen |
| Mobile/Desktop | Responsive-Regeln in `index.html` | Implementiert; echte Geräteabnahme offen |

## 3. Datenflüsse und Schnittstellen
```text
Login / business_members -> berechtigte Betriebs-IDs -> GastroPilot-Startseite
   |-> Friedrich (BID) -> Bonit / Lager / Kosten
   |-> Judith (BID) -> Umsätze / Rechnungen / bank_transactions
                                  |
                                  v
                        judith-ai-payment-inflows (Edge Function)
                                  |
                                  v
                       Judith AI: Zahlungseingänge (read-only UI)
Judith AI: Kunden / Anfragen / Aufträge --[Zuordnung noch nicht E2E verifiziert]--> Finanzanalyse
Berechtigte Betriebskennzahlen -> gemeinsame Gesamtumsatzansicht
```
`index.html` verwendet u. a. `documents`, `expenses`, `sales_invoices`, `gp_ledger_monthly`, `bonit_daily_closings`, `bank_transactions` mit Betriebsfiltern. Der Aufruf der Judith-AI-Zahlungsschnittstelle ist im Quellcode nachgewiesen, nicht die korrekte serverseitige Filterung. Die Judith-AI-Daten bleiben eigenständig; keine automatische ETRON-Verbuchung.

## 4. Sicherheit und Duplikate
- `businesses`, `business_members`, `bank_transactions`, `gp_ledger_monthly`: RLS/Policy-Namen lesend geprüft. Existenz von Policies ist **kein Beleg** für deren sichere Wirksamkeit; Policy-Ausdrücke und Rollen noch prüfen.
- `bank_transactions`: laut Judith-Projektstand Unique-Constraint auf `(business_id,source_hash)`; schützt nicht vor gleichen Buchungen mit unterschiedlichen Hashes.
- Frontend-Betriebsfilter allein genügen nicht; Edge Functions, Datenbank-RLS, Joins und Schreiboperationen müssen die Betriebszuordnung serverseitig erzwingen.
- Authentifizierte Aufrufe der Judith-AI-Zahlungsschnittstelle sind im Frontend sichtbar; serverseitige Autorisierung, Kundenzahlungsfilter und Duplikatverhalten noch nicht verifiziert.
- Keine Zugangsdaten, Kontodaten oder personenbezogenen Einzelbuchungen in dieser Datei dokumentieren.

## 5. Offene Befunde / Prioritäten
**Vor Testbetrieb prüfen (hoch):**
1. End-to-End Mandantentrennung: Friedrich-Daten dürfen weder in Judith AI noch in Judith-Auswertungen gelangen; negative Zugriffs-/API-Tests.
2. `judith-ai-payment-inflows`: Implementierung, RLS/Token-Prüfung, Filter ausschließlich echte Judith-Kundenzahlungen, Monat, Datum, Name, Betrag, Rechnungsnummer; keine Doppelübertragung.
3. Gesamtumsatz: eindeutige Kennzahlendefinition (Brutto/Netto), gleiche Monate, Berechtigungen, Quellen, fehlende Werte und Vermeidung doppelter Umsatzquellen.
4. Bankimport: Wiederholungsimport, `source_hash`-Kollisionen, abweichende Hashes, Rechnungsnummern- und Kundenzuordnung mit anonymisierten Testfällen.
5. RLS-Policy-Ausdrücke und Edge-Function-Berechtigungen überprüfen; nicht nur RLS-Flag/Policy-Namen.

**Kann nach erster Sicherheitsabnahme folgen:**
6. Gemeinsame Analysen aus Judith-AI-Aufträgen und GastroPilot-Finanzdaten mit dokumentierten, stabilen Zuordnungsschlüsseln und Berechtigungen.
7. Mobile/Desktop-Navigation und Monatswechsel in echten Browsern abnehmen.
8. Vollständige Code-/Edge-Function-Inventur, automatisierte Regressionstests und Deployment-Nachweis.

**Keine reproduzierten Laufzeitfehler in dieser lesenden Prüfung.** Offene Tests bedeuten ausdrücklich nicht, dass Funktionen fehlerfrei sind.

## 6. Verbindliche Arbeits- und Änderungsregeln
1. Vor jeder Änderung GitHub, Supabase-Struktur, betroffene Schnittstellen und Projektstanddateien prüfen.
2. Zentrale bearbeitet gemeinsame Komponenten; betriebsspezifische Änderungen nur nach konkretem Auftrag. Judith AI bleibt eigenständig; bei ausdrücklich beauftragter Schnittstellenänderung dürfen beide betroffenen Anwendungen nach Prüfung angepasst werden.
3. Kein Löschen/Überschreiben von Betriebsdaten; keine unautorisierte Änderung von Schnittstellen.
4. Friedrich/Judith strikt trennen, Rollen/RLS und serverseitige business_id-Prüfung sichern; keine doppelten Buchungen.
5. Bestehendes Design und Mobil-/Desktop-Funktion erhalten; Auswirkungen auf beide Betriebe testen.
6. Nach Änderung `PROJEKTSTAND_ZENTRALE.md`, bei Betroffenheit `PROJEKTSTAND_FRIEDRICH.md` / `PROJEKTSTAND_JUDITH.md` und für beauftragte Judith-AI-Schnittstellen die zuständige Judith-AI-Dokumentation aktualisieren.
7. Nachweise trennen: geplant / implementiert / Daten vorhanden / getestet / produktiv bestätigt.
8. Riskante Änderungen vorab freigeben lassen; Kosten niedrig halten, Unternehmensdaten vertraulich behandeln.

## 7. Änderungsprotokoll
| Datum | Maßnahme | Status |
| --- | --- | --- |
| 2026-11-02 | GitHub-/Supabase-Bestandsaufnahme, vorhandene Betriebsdokumentationen berücksichtigt; Zentrale-Projektstand neu angelegt | Dokumentation; keine App-/DB-Änderung |


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
