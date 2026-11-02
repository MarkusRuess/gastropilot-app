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
