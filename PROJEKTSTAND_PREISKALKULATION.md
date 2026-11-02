# Projektstand Preiskalkulation
Stand 2026-11-02, Version 20261102.1. Auftrag: gemeinsamer Preisberater GastroPilot Judith ↔ Judith AI. [Gesamtübersicht](PROJEKTUEBERSICHT_GESAMT.md).

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
