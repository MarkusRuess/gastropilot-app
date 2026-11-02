# Projektstand Preiskalkulation
Stand 2026-11-02, aktuelle Version 20261102.3 (historische Stände folgen chronologisch). Auftrag: gemeinsamer Preisberater GastroPilot Judith ↔ Judith AI. [Gesamtübersicht](PROJEKTUEBERSICHT_GESAMT.md).

## Technischer Umfang
| Teil | Implementierung |
|---|---|
| Kostenbrücke | Neue Edge Function `supabase/functions/judith-ai-price-advisor/index.ts`, JWT via getUser + aktive judith_ai_access-Berechtigung; feste Judith-business_id serverseitig |
| Rechenkern | `engine.mjs`: Material, Verpackung, geschätzte/angegebene Arbeitszeit, Personal-/Fixkosten, Zielmarge und Bruttobereich |
| Oberfläche | `judith-ai/price-advisor.js`, eingebunden in `postfach.html`; rosa Kachel, Fotoergebnis, geöffnete E-Mail und einzelne Kalenderaufträge |
| Team | Separate Tabelle `judith_ai_price_opinions`; Mitarbeiter-ID serverseitig aus Auth, eigene Einschätzungen und Begründungen; keine Änderung am Auftragspreis |
| Quellen | gp_ledger_monthly (nur verified), personnel_costs, expenses, gp_recipes, gp_recipe_ingredients, gp_ingredient_catalog; ausschließlich Judith |

## Kalkulation und ehrliche Grenzen
- Jede Empfehlung wird ausdrücklich als **vorläufige Schätzung** angezeigt. Keine behauptete exakte Rentabilität.
- Personal-/Fixkosten: Je Kostenart Mittel der bis zu drei jüngsten abgeschlossenen Monate mit positivem Kostenwert; pro Monat Maximum aus geprüfter Saldenliste und Einzelkosten statt Addition derselben Kosten. Höhere bereits erfasste aktuelle Monatskosten werden sofort berücksichtigt, unvollständige aktuelle Monate senken die Basis nicht.
- Vorläufige Kapazitätsannahme **400 produktive Stunden/Monat**. Fehlende Kosten: 35 EUR Personal + 8 EUR Fixkosten je Stunde. Keine bestätigten betrieblichen Stundensätze.
- Fehlende Rezeptur: 1,80 EUR Material/Portion, 3 EUR Verpackung/Torte. Zeitannahme 60 Minuten/Torte + 2 Minuten/Portion, Hochzeit 180 Minuten/Torte + 2 Minuten/Portion. Eingetragene Gesamtarbeitszeit ersetzt die Zeitannahme.
- Rezepturen werden nur bei eindeutigem Namenstreffer verwendet. Zutatenpreise aus Katalog nur bei passenden Einheiten, sonst gekennzeichneter Rezeptur-Fallback; unvollständige Rezepte werden nicht mit Nullkosten berechnet. Rezepturmengen und Portionen sind vor Angebot zu prüfen.
- Vorläufig 20 % Zielmarge auf Nettoverkauf und 10 % Umsatzsteuer; Brutto auf 5 EUR aufgerundet. Orientierungsband 90–120 %, keine statistische Konfidenz.
- Vorhandene Foto-KI erkennt Handschrift/Kundenpreis unverändert; Preisberater nutzt deren Text/Preis. Textregeln erkennen eindeutig genannte Portionen, Hochzeit und Preise. Fehlende/mehrdeutige Portionen erfordern Ergänzung, Tortenanzahl wird nicht als Portionenzahl verwendet. Keine neue kostenpflichtige KI pro Kalkulation.
- E-Mails: Textanalyse nach Öffnen, keine neue Versandlogik. Freie, komplexe Formulierungen und alte zitierte Preise können manuelle Prüfung erfordern. Keine vollständige semantische KI-Analyse oder Dekor-Bilderkennung neu implementiert.
- Frühere Torten: bis zu drei Beispiele mit ähnlichen Textmerkmalen, Anlass/Datum/eindeutigem Preis; keine Kundennamen. Orientierung, keine automatische Gleichsetzung unterschiedlicher Größen oder Übernahme historischer Unterpreise.
- Neue Daten werden **bei jedem Abruf/Neuberechnen** gelesen. Keine Hintergrund-Push-Neuberechnung und keine automatische Umrechnung jeder neuen Rechnungsposition in Zutatenpreise; bestehender Katalog muss aktualisiert sein. Neue nicht zugeordnete Fixkostenkategorien bleiben offen.
- Foto-Entwurf-Einschätzungen sind textbezogen; nach Speicherung des Auftrags erfolgt derzeit keine automatische Übernahme an die neue Auftrags-ID. Kalenderaufträge verwenden beständige Auftrags-IDs.

## Datenschutz und Grenzen der Änderungen
Keine Änderungen an Friedrich, index.html, Kundenpreisen, Kundenaufträgen, bestehender Foto-KI, Zahlungsanzeigen, Mailversand oder bestehenden RLS-Policies. Finanzdatensätze bleiben unverändert. Neue Tabelle hat RLS und keine Rechte für anon/authenticated; nur Service-Rolle mit SELECT/INSERT, Zugriff ausschließlich über autorisierte neue Edge Function. Antwort enthält nur Empfehlung, Kundenpreis/Differenz, Schätzhinweise, Quellenmonate, Vergleichspreise und Team-Einschätzungen. Keine Rohkosten, Mitarbeitergehälter oder Saldenlisten im Frontend.

## Tests und Veröffentlichung
- 16 automatische Tests: Rechenfälle, Schätzungen, Hochzeiten, deutsche Preise, Mengenprüfung, Rezeptureinheiten, aktuelle Kosten, Doppelerfassung, erlaubte Antwortfelder, simulierte JWT-/Zugangsprüfung, feste Judith-Zuordnung und isolierte Einschätzungsspeicherung bestanden.
- Syntaxprüfung aller eingebetteten JavaScript-Module und price-advisor.js bestanden.
- Serverintegrationstests verwenden eine simulierte Datenbank; sie ersetzen keine echte Mitarbeiter-End-to-End-Abnahme.
- Authentifizierter Browser nicht vorhanden (Live-Seite meldet „Keine Anmeldung vorhanden“). Keine zusätzlichen Testkonten erstellt. Vollständiger Foto→Empfehlung→Team→Kalender-Test bleibt offen.
- Veröffentlichung und technische Live-Nachweise werden nach Deployment unten ergänzt. Nicht als vollständig abgenommen kennzeichnen.

## Offene Weiterentwicklung
Betriebliche Kapazität/Stundensätze/Zeitansätze/Portionsgrößen bestätigen und versionierbar konfigurieren; Rezepturpreiseinheiten vollständig normalisieren; komplexe E-Mail-/Dekorinterpretation und Vergleich je Portion verfeinern; belegpositionsbezogene Zutatenpreisaktualisierung; gespeicherte Kalkulationsversionen samt Kostenstichtag und Übernahme Foto-Entwurf→Auftrag; authentifizierte Mitarbeiter-/Mobilabnahme. Nach jeder Änderung diese Datei und betroffene Projektstände pflegen.

## Technische Veröffentlichung – Zwischenstand
- Entwicklungscommit `a250a01a2155ea93346dc6a0ab7c9ae311824f07`, PR #56.
- Separate Tabelle angewendet; RLS=true, anon SELECT=false, authenticated SELECT=false, service_role INSERT=true direkt in PostgreSQL nachgewiesen.
- Neue Edge Function aktiv, Version 1, verify_jwt=true. Security Advisor meldet für die neue Tabelle RLS ohne Policies; absichtlich ohne direkten Clientzugriff, nicht durch eine offene Policy „behoben“. [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
- GitHub-Actions-Workflow ergänzt: 16 Tests, Syntaxprüfung und echter anonymer Live-POST muss HTTP 401 liefern. Laufresultat separat nachtragen.

## Nachgewiesenes Ergebnis 2026-11-02
- PR [#56](https://github.com/MarkusRuess/gastropilot-app/pull/56) zusammengeführt, Produktivcommit `e7e5c007112888d7d6c75e62bfa0fee62d62d3d3`.
- GitHub Actions [Testlauf 41452733035](https://github.com/MarkusRuess/gastropilot-app/actions/runs/41452733035): erfolgreich, alle 16 Tests und echter anonymer Live-POST (HTTP 401) bestanden.
- GitHub-Pages-[Deployment 41452819480](https://github.com/MarkusRuess/gastropilot-app/actions/runs/41452819480): erfolgreich.
- Live-Seite `https://markusruess.github.io/gastropilot-app/judith-ai/postfach.html` neu geladen: Preisberater-Kachel im tatsächlich ausgelieferten DOM nachgewiesen; keine Anwendungs-JavaScript-Fehler in der Browserkonsole beobachtet.
- Sichtbare Seite bleibt ohne Sitzung gesperrt („Keine Anmeldung vorhanden“). **Keine authentifizierte Live-Kalkulation oder echte Team-Synchronisation bestätigt.** Nicht vollständig abgenommen.
- Nachprüfung ergänzt Tausendertrennzeichen in deutschen Textpreisen (z. B. 1.250,50 EUR); gleicher Testumfang erneut erfolgreich.

Nachprüfung: Monate mit nur Materialbelegen dürfen bekannte Personalkosten nicht rechnerisch senken; Kategorie-spezifische Auswahl der Kostenmonate getestet.

## Phase 2 – 2026-11-02, Version 20261102.2
Dieser Abschnitt ergänzt/ersetzt die Einschränkungen der ersten Version, soweit ausdrücklich beschrieben.

### Umgesetzt
| Bereich | Tatsächliche Änderung |
|---|---|
| Fotos | Aktuelle korrigierte Formularwerte werden bei jeder Berechnung gelesen; Tortenanzahl und Portionen getrennt. KI-Extraktionsschema um portions ergänzt. Entwurfs-UUID bleibt bis zum erfolgreichen Speichern erhalten. |
| Auftragsbindung | judith_ai_price_drafts + eindeutige optionale price_draft_id am Auftrag; Foto-Speicherung ist je Entwurf idempotent. Service-only RPC verbindet Empfehlungen und Einschätzungen atomar; geprüfte Entwurfseigentümerschaft und tatsächlicher Auftragsbezug. Ein DB-Trigger fängt gleichzeitig eintreffende Kalkulationen/Einschätzungen ab. |
| E-Mail | Aktueller Nachrichtenteil ohne typischen zitierten Verlauf. Bei vorhandener Auftragszuordnung wird dessen ID/vereinbarter Preis verwendet. Neue mailbasierte Aufträge übernehmen gespeicherte Werte per Trigger. Erneutes Öffnen aktualisiert den Preisberater. |
| Kalender | Empfiehlt mit frischen serverseitigen Auftragsdaten, zeigt gespeicherte Empfehlungen und Team-Einschätzungen am Auftrag. Fehler bei parallelen alten Antworten nach Eingabekorrektur abgefangen. |
| Persistenz | judith_ai_price_calculations speichert versionierte Ergebnisse, Kostenfingerabdruck und Auftragsschlüssel. Gleiche Eingaben/Kosten werden dedupliziert; Vergangenheit wird nicht durch neue Kosten überschrieben. Speichern muss erfolgreich sein, bevor die Oberfläche Erfolg meldet. |
| Rechnungen | Neuer Judith-only Dokument-Trigger; eindeutige normalisierte Namen/Aliase, sichere kg/g- und L/ml-Umrechnung, positive Nettopreise, Mengensummenprüfung und Datumsschutz. Sichere Positionen aktualisieren Judith-Zutatenkatalog/Preishistorie; noch unverbundene eindeutige Rezeptzutaten werden verknüpft. Keine Änderung bestehender gemeinsamer Importfunktionen. |
| Laufende Kosten | Frische Personal-, geprüfte Saldenlisten-, Rechnungs- und Bank-Fixkostendaten bei jeder Kalkulation. Fehlende Gesamtlöhne aus vorhandenen Lohn-/Dienstgeberkomponenten. Verschiedene Fixkostenkategorien werden kombiniert; je Kategorie wird Rechnung/Zahlung nicht addiert. Bankbeträge ohne Nettoangabe konservativ brutto und ausdrücklich geschätzt. |
| Schutz | Bestehende vereinbarte Preise serverseitig maßgeblich, Vergleichsfeld dann gesperrt. Keine Preisänderung am Auftrag, kein Mailversand. Keine internen Kostensätze, Gehälter oder Rechnungspositionen in API/Frontend. |

### Automatik: klare Grenzen
- Übernahme nur bei `reviewed`/`auto_imported`, ohne `needs_review`, ohne Duplikatwarnung, mit eindeutigem Nettopreis und Datum. Andere Belege werden automatisch beurteilt und als Prüfbedarf gespeichert, aber nicht zu bestätigten Zutatenpreisen gemacht.
- Karton/Gebinde unbekannter Größe, fehlende Preise, mehrdeutige Aliase, widersprüchliche Zeilensummen oder unterschiedliche Preise am gleichen Tag bleiben ausdrücklich offen. Ältere Rechnungen ersetzen keine neueren Katalogpreise.
- Aktueller echter Datenbefund nach Migration: **sechs Positionen aus drei Judith-Rechnungen mit `review_source`**. Die Dokumente stehen bereits im bestehenden Prüfstatus; keine Freigabe und keine Preisübernahme erzwungen.
- Ältere Phase-1-Text-Hashes werden nicht blind einem Auftrag zugeordnet. Neue Fotos und E-Mails verwenden stabile IDs.
- Empfehlungen bleiben Schätzungen (Kapazität, Zeit, Zielmarge/USt und unvollständige Rezepturen). Kein automatisches Angebot, keine verdeckte Veränderung vereinbarter Preise. Noch keine detaillierte KI-Interpretation beliebiger Dekor-Fotos oder unbekannter Gebinde.

### Datenbank und Berechtigungen
Migrationen `20261102_judith_price_phase2.sql` und `20261102_judith_price_guard_numeric.sql` angewendet. Neue Tabellen: `judith_ai_price_drafts`, `judith_ai_price_calculations`, `judith_price_invoice_links`. Alle mit RLS, ohne direkten SELECT für anon/authenticated. Interne Triggerfunktionen im nicht freigegebenen Schema `gp_price_private`, fester Judith-Filter. RPC `judith_price_attach_draft` ist SECURITY INVOKER, nur service_role darf ausführen. Bestehende Mitarbeiterberechtigungen unverändert.

Keine Änderungen an index.html, Friedrich-Dateien, Friedrich-Importfunktionen, Finanzdatensätzen oder Zahlungsanzeige. Einziger Zusatz an Auftragsstruktur: nullable, eindeutiger Verweis price_draft_id für neue Fotoaufträge. Bestehende Aufträge und Kundenpreise nicht überschrieben.

### Nachweise vor Veröffentlichung
- **24 automatische Programmtests bestanden**: Rechenkern, serverseitige API-Verträge, echte Foto-Save-Handlerlogik mit simulierter DB, ID-Zuordnung, Wiederholung ohne zweiten Auftrag, Persistenz/Deduplikation, E-Mail-Auftragsprüfung, UI-Antwortrennen, Formular-Korrekturen, Wiederöffnen, Kostenschutz und Kostenkategorien.
- JavaScript-Syntax: beide eingebetteten Live-Seiten-Skripte sowie Preisberater-Modul bestanden.
- **19 echte PostgreSQL-Assertions bestanden**: Rechnung→Zutat, Einheiten, Datum, Wiederholung, unbekannte Packung, Konflikte, fehlerhafte Mengen/Zeilensummen, Quellprüfung, mehrdeutige Aliase, Friedrich-Ausschluss, Entwurf→Auftrag einschließlich später eintreffender Einschätzung, unveränderter Kundenpreis.
- Sämtliche SQL-Testdaten ausschließlich innerhalb einer Transaktion; ROLLBACK ausgeführt, verbliebene QA-Zutaten=0 direkt nachgewiesen. Keine Testkonten angelegt.
- Direkte Datenbankprüfung: RLS aktiv; anon/authenticated SELECT auf allen drei neuen Tabellen=false.
- Security Advisor geprüft. Erwartete RLS-ohne-Policy-Meldungen bei service-only Tabellen sind kein Anlass für offene Mitarbeiter-Policies. Bestehende fremde Befunde unverändert.
- Browser weiterhin ohne Judith-AI-Sitzung. Authentifizierte vollständige Live-Bedienprüfung kann damit weiterhin nicht bestätigt werden; automatisierte Vertrags-/UI-Tests sind keine echte Mitarbeiter-Browserabnahme.
- Produktivdeployment, Quellcode-Versionen und GitHub-Nachweise werden beim Abschluss ergänzt.

Phase-2-Nachprüfung: Sitzung-Header stehen jetzt vor dem Rendern eines zwischengespeicherten Kalenders bereit. Dadurch entsteht beim automatischen Preisabruf kein irreführender Anmeldefehler allein durch die Initialisierungsreihenfolge. Reihenfolge automatisiert geprüft. GitHub-CI 41457080014 erfolgreich; neue Edge Functions Preisberater/Fotobestellung jeweils Version 4 aktiv mit JWT.


## Phase 2 – Veröffentlichungsnachweis 2026-11-02
- PR [#58](https://github.com/MarkusRuess/gastropilot-app/pull/58) zusammengeführt; Produktivcommit `81f9ed0814c90c637fd0043ef8e72f8cc46443eb`.
- [GitHub-CI 41457462938](https://github.com/MarkusRuess/gastropilot-app/actions/runs/41457462938) erfolgreich: 24 Programmtests, Inline-/Modulsyntax und echter anonymer Live-POST wird mit HTTP 401 abgewiesen. Vor Merge ebenfalls CI 41457386215 erfolgreich.
- [Pages-Deployment 41457462905](https://github.com/MarkusRuess/gastropilot-app/actions/runs/41457462905) erfolgreich. Live-Seite neu geladen: Phase-2-Modulkennung und Foto-Entwurfsübergabe im tatsächlich ausgelieferten DOM nachgewiesen; keine Anwendungsfehler in der Browserkonsole beobachtet.
- Preisberater und Foto-Auftragsfunktion jeweils Version 4 ACTIVE, verify_jwt=true; tatsächlich deployte Quelldateien exakt mit geprüftem GitHub-Stand verglichen.
- 19 PostgreSQL-Assertions mit ROLLBACK erfolgreich; keine QA-Zutaten verblieben. Direkter Mitarbeiter-/anonymer Tabellenzugriff und RPC-Ausführung gesperrt, Service-Zugriff nachgewiesen.
- 18 geänderte Repository-Dateien geprüft: kein Friedrich-Code, keine gemeinsame GastroPilot-Startseite, kein gemeinsamer Belegimport geändert.
- **Keine vollständige authentifizierte Live-Bedienabnahme:** Browser meldet weiterhin „Keine Anmeldung vorhanden“. Foto-/Mail-/Kalenderabläufe sind durch Programm-/Datenbanktests geprüft, aber nicht als echte Mitarbeiter-Browsersitzung bestätigt. Keine Testkonten angelegt.
- Sechs Positionen aus drei echten Rechnungen weiterhin `review_source`; keine ungeprüfte Preisübernahme erzwungen. [Detailstand](PROJEKTSTAND_PREISKALKULATION.md).

## Abschließende Qualitätskontrolle – 2026-11-02, Version 20261102.3
**Ergebnis: Programmfehler nachgewiesen und korrigiert; keine uneingeschränkte fachliche oder authentifizierte Live-Abnahme.**

### Prüfmethoden und Ergebnisse
| Bereich | Nachweis | Ergebnis / Grenze |
|---|---|---|
| Echte Aufträge | Alle 26 vorhandenen Anfragen/Aufträge lesend aus Supabase geprüft und mit echtem Rezept-/Kostensnapshot im Rechenkern nachgerechnet | 14 mit vorhandenen Angaben berechenbar; 12 benötigen eindeutige Portionen. Keine Kundenpreise/Auftragsdaten ergänzt oder geändert. Dieser Replay ist kein authentifizierter Live-HTTP-Test. |
| Fotoerkennung | Aktiver Foto-Handler und Foto→Entwurf→Auftrag-Vertrag geprüft; Datenqualität alter Foto-Erfassungen geprüft | Fehlende Portionen und auffällige Stückzahlen in Alt-Erfassungen bleiben offen. Kein eindeutig zugehöriges handschriftliches Original für diese bestehenden Fotoaufträge verfügbar; keine neue echte OCR-Auslesung als bestanden behauptet. |
| E-Mail | Zwei echte gespeicherte Nachrichten samt vorhandenem Auftragsbezug gelesen; alle vorhandenen Mail-Aufträge im Replay berücksichtigt | Wiederholte eindeutige Personenangaben und abweichende Gäste-Metadaten geprüft. Keine Mails geändert oder versendet. |
| Kalender | 12 datierte Datensätze nachgewiesen; bestehende Darstellung und Syntax geprüft | Ohne angemeldete Sitzung keine visuell bestätigte Bedienung/Preisempfehlung im Kalender. |
| Mitarbeitereinschätzungen | Anfangsbestand: 0 Einschätzungen, 0 Kalkulationen, 0 Entwürfe; isolierte Tests und echte PostgreSQL-Assertions mit Rollback | Keine bestehende echte Mitarbeiter-Synchronisation zum Gegenprüfen vorhanden. Persistenz/Zuordnung technisch geprüft; echte Mitarbeiter-Browserbedienung unbestätigt. |
| Originalbelege | Alle drei zu den sechs offenen Positionen referenzierten Originalfotos abgerufen und visuell geprüft; Quell-Hashes stimmen mit gespeicherten Nachweisen überein | Vier Positionen betreffen Kontaktlinsen bzw. Tankstelle/Getränk/Pfand, keine bestätigten Rezeptzutaten. Zwei Positionen betreffen Eier und einen noch ungeklärten möglichen Doppelbeleg. Keine automatische Freigabe/Buchung/Preisübernahme. |
| Datenschutz/Erhaltung | Vorher-/Nachher-Prüfsummen der Aufträge, Kunden, Dokumente und bestehenden Einschätzungen verglichen | Identisch. Keine Betriebs-/Kunden-/Auftragsdaten dauerhaft verändert; keine zusätzlichen Testkonten. |

### Nachgewiesene Programmfehler und Korrekturen
1. **Schwerwiegender Dezimalfehler:** Bereits numerische Datenbankwerte mit genau drei Nachkommastellen wurden durch die deutsche Tausender-Erkennung verändert (z. B. numerisch 2.868 → 2868). Numerische Werte werden jetzt ohne Textlokalisierung übernommen; deutsche Texteingaben wie 1.250,50 bleiben unterstützt. In einer echten nachgerechneten Rezeptkalkulation führte der Fehler zu einem unrealistischen vierstelligen Vorschlag. Keine vorhandenen Kalkulationsdatensätze mussten repariert werden (Bestand vor Prüfung: 0).
2. **Hochzeitstag fälschlich Hochzeit:** Jubiläums-/Hochzeitstagsbeschriftungen lösen nicht mehr pauschal den Hochzeits-Zeitansatz aus.
3. **Mehrfach identisch genannte Portionen:** Zweimal „12 Personen“ wird als ein eindeutiger Wert erkannt. Echte widersprüchliche Werte bleiben unklar. Eine Abweichung zwischen expliziter Beschreibung und Gäste-Metadaten wird nur für die Kalkulation behandelt und sichtbar gewarnt; die Auftragsdaten bleiben unverändert.
4. **Vorhandene Prinzess-Schreibweisen:** „Prinzess Torte“/„Prinzess-Torte“ können die vorhandene Prinzesstorte-Rezeptur eindeutig treffen. Keine automatische Gleichsetzung einer normalen Sachertorte mit einer Holzverpackungsvariante.
5. **Unvollständiger Angebotsumfang:** Bei Liefer-/Aufbau-/Verkostungswünschen steht ausdrücklich dabei, dass diese Positionen separat kalkuliert werden müssen. Der Hinweis auf ungeklärte Belege behauptet nicht mehr pauschal, diese seien Rezeptzutaten.

### Wirtschaftliche Plausibilität
Die arithmetischen Fehler sind behoben. **Eine belastbare betriebliche Preisfreigabe ist weiterhin offen:** 400 produktive Stunden/Monat, geschätzte Fertigungs-/Dekorzeiten, 20 % Zielmarge, angenommene Umsatzsteuer und teilweise fehlende Rezepturen/Größenbezüge sind keine bestätigten Ist-Werte. Bestehende Rezepturen enthalten teils sehr kurze Arbeitszeiten; der Mindest-Schätzansatz verhindert deren ungeprüfte Übernahme, ersetzt aber keine echte Zeitaufnahme. Lieferung, Aufbau, Verkostung und nicht erfasste Zusatzartikel sind keine bestätigten Vollkosten. Alle Vorschläge bleiben ausdrücklich Schätzungen, keine verbindlichen Kundenangebote.

### Offene Rechnungen nach Originalprüfung
| Positionen | Feststellung am Original | Umgang |
|---|---|---|
| 1 Sammelposition Kontaktlinsen | Vier Kontaktlinsen, kein Lebensmittel-/Tortenzutatenbeleg | Keine Rezeptpreiszuordnung; betrieblicher Zweck nicht nachgewiesen |
| 3 Positionen Tankstelle | Diesel, Getränk und Pfand getrennt sichtbar | Keine Rezeptpreiszuordnung; Fahrzeug-/Betriebszweck nicht nachgewiesen |
| 2 Eierpositionen | Unterschiedliche Eiergrößen/Einzelpreise am echten Lieferantenbeleg sichtbar, Empfänger J.W. GmbH | Möglicher Doppelbeleg zu vorhandener, anders beschriebener Ausgabe bleibt ungeklärt; dort kein Original-/Dokumentverweis hinterlegt. Keine Doppelbuchung oder neue Preisfreigabe erzwungen |

Die Rechnungsstatus und sechs `review_source`-Datensätze bleiben bewusst unverändert. Eine formale Zuordnung oder steuerliche Behandlung wird aus den Fotos nicht abgeleitet.

### Automatische Tests versus Live-Bedienung
- **28 automatische Programmtests bestanden**, einschließlich der neuen Dezimal-, Jubiläums-, Portions-, Rezeptschreibweisen- und Konfliktfälle. Beide eingebetteten JavaScript-Module syntaktisch geprüft.
- **19 echte PostgreSQL-Assertions erneut bestanden**, sämtliche Testdaten zurückgerollt; keine Testkonten angelegt.
- **Tatsächlich live beobachtet:** Öffentliche Judith-AI-Seite ist erreichbar, zeigt jedoch weiterhin „Keine Anmeldung vorhanden“. Eine angemeldete Foto-/Mail-/Kalender-/Team-Bedienung ist damit nicht bestätigt. Keine Authentifizierung umgangen oder Berechtigung erweitert.
- Originalfotos und echte Kunden-/Finanzdaten bleiben außerhalb des Repositorys; dort nur dieser sachliche Prüfbericht und anonymisierte Regressionstests.
- Korrekturen im Entwicklungsbranch `fix/judith-price-final-qa-20261102`; Veröffentlichungsnachweise werden nach erfolgreichem Deployment angefügt.
