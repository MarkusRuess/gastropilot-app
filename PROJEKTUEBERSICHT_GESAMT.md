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


## 2026-11-02 – Preisberater (ausdrücklich beauftragte Produktivveröffentlichung)
- Neue gemeinsame Judith-Schnittstelle `judith-ai-price-advisor`: GastroPilot-Kosten werden ausschließlich serverseitig für Judith gelesen; Mitarbeiter erhalten eine vorläufige Empfehlung, keine internen Finanzdaten.
- Judith AI: Kachel Preisberater, Fotoauslesung, geöffnete E-Mail und Kalenderdetails. Kundenpreise werden nicht geändert, E-Mails nicht versandt.
- [Projektstand Preiskalkulation](PROJEKTSTAND_PREISKALKULATION.md) ist die verbindliche Detailreferenz.
- Dieser Auftrag erlaubt Entwicklung, Migration der separaten Einschätzungs-Tabelle, Veröffentlichung und Livekontrolle; die frühere Beschränkung dieser Bestandsaufnahme auf den QA-Branch gilt nicht als Sperre dieses konkreten Auftrags. QA-Branch geprüft, nicht pauschal zusammengeführt.


Preisberater: PR #56 produktiv zusammengeführt, Pages-Deployment 41452819480 erfolgreich. Live-DOM enthält die Kachel; 16 Tests und anonymer HTTP-401-Test erfolgreich. Authentifizierte fachliche Abnahme offen, siehe [Projektstand](PROJEKTSTAND_PREISKALKULATION.md).

## Preisberater Phase 2 – 2026-11-02
Ausdrücklich beauftragte Judith-Schnittstellenentwicklung: Dokument→sichere Zutatenpreis-/Rezeptzuordnung (Judith-only Trigger), frische Kostenbasis und dauerhafte Empfehlung/Einschätzung→Auftrag. Neue service-only Tabellen, Entwurfs-UUID und transaktionale Zuordnung. Friedrich und gemeinsame Importfunktionen unverändert. 24 Programmtests + 19 PostgreSQL-Assertions bestanden; echte Mitarbeiter-Browserabnahme mangels Sitzung offen. Details: [PROJEKTSTAND_PREISKALKULATION.md](PROJEKTSTAND_PREISKALKULATION.md).


## Phase 2 – Veröffentlichungsnachweis 2026-11-02
- PR [#58](https://github.com/MarkusRuess/gastropilot-app/pull/58) zusammengeführt; Produktivcommit `81f9ed0814c90c637fd0043ef8e72f8cc46443eb`.
- [GitHub-CI 41457462938](https://github.com/MarkusRuess/gastropilot-app/actions/runs/41457462938) erfolgreich: 24 Programmtests, Inline-/Modulsyntax und echter anonymer Live-POST wird mit HTTP 401 abgewiesen. Vor Merge ebenfalls CI 41457386215 erfolgreich.
- [Pages-Deployment 41457462905](https://github.com/MarkusRuess/gastropilot-app/actions/runs/41457462905) erfolgreich. Live-Seite neu geladen: Phase-2-Modulkennung und Foto-Entwurfsübergabe im tatsächlich ausgelieferten DOM nachgewiesen; keine Anwendungsfehler in der Browserkonsole beobachtet.
- Preisberater und Foto-Auftragsfunktion jeweils Version 4 ACTIVE, verify_jwt=true; tatsächlich deployte Quelldateien exakt mit geprüftem GitHub-Stand verglichen.
- 19 PostgreSQL-Assertions mit ROLLBACK erfolgreich; keine QA-Zutaten verblieben. Direkter Mitarbeiter-/anonymer Tabellenzugriff und RPC-Ausführung gesperrt, Service-Zugriff nachgewiesen.
- 18 geänderte Repository-Dateien geprüft: kein Friedrich-Code, keine gemeinsame GastroPilot-Startseite, kein gemeinsamer Belegimport geändert.
- **Keine vollständige authentifizierte Live-Bedienabnahme:** Browser meldet weiterhin „Keine Anmeldung vorhanden“. Foto-/Mail-/Kalenderabläufe sind durch Programm-/Datenbanktests geprüft, aber nicht als echte Mitarbeiter-Browsersitzung bestätigt. Keine Testkonten angelegt.
- Sechs Positionen aus drei echten Rechnungen weiterhin `review_source`; keine ungeprüfte Preisübernahme erzwungen. [Detailstand](PROJEKTSTAND_PREISKALKULATION.md).


Preisberater-QA 2026-11-02: Rechenfehler bei numerischen Dezimalwerten sowie Hochzeitstag-/Portionsinterpretation korrigiert. 26 echte Datensätze lesend geprüft; 28 Programmtests + 19 PostgreSQL-Assertions bestanden. Keine Betriebsdatenänderung, keine Friedrich-Änderung. Angemeldete Live-Bedienung und belastbare wirtschaftliche Freigabe bleiben offen. [Prüfbericht](PROJEKTSTAND_PREISKALKULATION.md).


## QA-Veröffentlichungsnachweis 2026-11-02
- PR [#60](https://github.com/MarkusRuess/gastropilot-app/pull/60) zusammengeführt, Produktivcommit `21810dfe9da1e545e6e4b560010612b8b85edeae`.
- [GitHub-CI 41460682804](https://github.com/MarkusRuess/gastropilot-app/actions/runs/41460682804) erfolgreich: 28 Programmtests, Syntax und echter anonymer Live-POST (HTTP 401). Vor Merge ebenfalls CI 41460549473 erfolgreich.
- [Pages-Deployment 41460682915](https://github.com/MarkusRuess/gastropilot-app/actions/runs/41460682915) erfolgreich. Preisberater-Edge-Function Version 5 ACTIVE, verify_jwt=true; beide tatsächlich deployten Quelldateien exakt mit geprüftem Repository-Stand verglichen.
- Originalbelege: alle drei Fotos anhand SHA-256 exakt mit den gespeicherten Quellverweisen abgeglichen und visuell gelesen. Keine Kopien/Beleginhalte/Kunden- oder Finanzrohdaten ins Repository geschrieben.
- Echte Daten nur lesend geprüft: 26 Datensätze, 14 mit vorhandenen Angaben berechenbar, 12 ohne eindeutige Portionen. Vorher-/Nachher-Prüfsummen von Aufträgen, Kunden, Dokumenten und bestehenden Einschätzungen identisch.
- 19 PostgreSQL-Assertions mit vollständigem Rollback erfolgreich. Keine tatsächliche Mitarbeiter-Einschätzung erzeugt oder bestehende Kundendaten verändert.
- Acht geänderte Dateien kontrolliert; kein Friedrich-Code oder gemeinsame GastroPilot-Startseite geändert.
- **Abnahmestatus: technisch geprüfte Korrektur veröffentlicht, keine vollständige fachliche/angemeldete Live-Freigabe.** Fehlende Browser-Sitzung, fehlende Portionen und unbestätigte betriebliche Zeit-/Kapazitätsansätze bleiben ausdrücklich offen. Die sechs Rechnungspositionen bleiben ohne ungeprüfte Kostenübernahme im bisherigen Prüfstatus.


## 2026-11-02 – Friedrich Lager & Inventur
Ausdrücklich beauftragte Friedrich-only Entwicklung: eigener Lagerbereich, gemeinsame Supabase-Bestandsberechnung für Einkauf und Inventur, belegbezogene Lieferungen, Einzelzählungen, Bonit-Rezeptverbrauch, getrennte Verluste und versionierte Monatsstände mit PDF/CSV. Neue Objekte ausschließlich `gp_f_stock_*` und `gp_stock_private`; Details, Tests und Abnahmegrenzen in [PROJEKTSTAND_FRIEDRICH.md](PROJEKTSTAND_FRIEDRICH.md). Der zentrale Upload erhält ausschließlich im Friedrich-Zweig zusätzliche Mengen-/Gebindefelder; Judith AI und Judiths Schnittstellen bleiben unverändert. QA-Branch lesend verglichen, nicht pauschal übernommen. Dieser konkrete Auftrag erlaubt getestete Migration und Veröffentlichung.


## 2026-11-05 – Gemeinsame mobile Fotoauswahl, PR #79
Vorhandene native Kamera-/Dateiauswahlkorrektur für Judith und Friedrich; bestehende Erkennung, Datentrennung und Berechtigungen unverändert. Zusatztests für Touch-/Tastaturaktivierung in Chromium/WebKit und betriebsgebundene Wiederholungsimporte ergänzt. Details und Live-Abnahmegrenzen in den Projektständen Zentrale, Judith und Friedrich. Judith AI unverändert.

### Automatischer Abnahmenachweis PR #79
- [Mobile-CI 42065717559](https://github.com/MarkusRuess/gastropilot-app/actions/runs/42065717559) erfolgreich auf `0c5852478cc4d20f4141b057d2e79da1e88de4cc`: 18 Komponenten-/Hashszenarien in Chromium und WebKit, je Judith/Friedrich bei 390px mit Touch; Kamera-/Galerie-Dateidialog, Auswahlübernahme, Leeren, Enter/Leertaste, betriebsgebundener Wiederholungsimport. Zusätzlich Inline-/Edge-Syntax und 19 Belegseitentests erfolgreich.
- Erste Zusatztestausführung scheiterte am unvollständigen Testaufbau (deaktivierter Leeren-Button); Test verwendet inzwischen unveränderte echte `drawQueue`-Funktion. Kein zusätzlicher App-Fehler und keine Neuentwicklung.
- Veröffentlichung über vorhandenen Pages-Workflow nach Merge von [PR #79](https://github.com/MarkusRuess/gastropilot-app/pull/79), bestehender Link `https://markusruess.github.io/gastropilot-app/`, Bereich Betrieb → Hochladen. Aktueller Merge-/Deploymentnachweis im PR.
- Keine vollständige Live-Fertigmeldung: physisches Smartphone, angemeldeter Upload, echte OCR und anschließende Datenpersistenz bleiben offen.

- Paralleler zweiter CI-Lauf zeigte einen intermittierenden Fokus-/Dateidialog-Timeout im Tastatur-Test nach Dialogabbruch. Tastaturtests deshalb in frischen isolierten Seiten ausgeführt; Touch-Tests und App-Code unverändert. Erneute CI vor Merge erforderlich.


## 2026-11-05 – Button HOCHLADEN: reproduzierter Fehler
`gpUploadShortcut` öffnete den äußeren Detailbereich, ließ aber `intake.mobileHidden` aus `showMobilePanel('monthlyReference')` bestehen. Deshalb blieb der Upload am Handy (max. 680px) unsichtbar. Korrektur: `openArea('upload')` entfernt diese Klasse nur am bestehenden Uploadbereich. Keine Änderung an OCR, Uploadverarbeitung, Betriebszuordnung, Datenbank oder Berechtigungen.
Vorher scheiterten zwei neue Regressionstests (Judith/Friedrich); nachher bestanden 55 Programmtests und Inline-/Edge-Syntax. Bestehender Browsertest prüft zusätzlich echten HOCHLADEN-Klick, sichtbaren Uploadbereich und erneutes Öffnen für beide Betriebe bei 390/1200px. Prüfungen im bestehenden Workflow qa-friedrich-stock.yml gebündelt; experimentellen separaten Picker-Workflow entfernt. Aktueller Prüf-/Veröffentlichungsnachweis in PR #79. Echte angemeldete Kameraaufnahme/OCR/Persistenz bleiben bis tatsächlicher Bedienprüfung offen.
