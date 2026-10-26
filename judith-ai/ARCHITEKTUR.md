# Judith AI – Architektur und Umsetzungsplan
Status: Entwurf auf Entwicklungsbranch, nicht produktiv. Keine echten Kundendaten oder Geheimnisse im Repository.

## Leitplanken
- Eigenständige Judith-AI-Weboberfläche; GastroPilot bleibt unverändert.
- Supabase-Projekt als technische Grundlage, aber getrennte Tabellen/Namespaces, RLS und rollenbasierte Serverzugriffe.
- Ein einfacher Login-Bildschirm; vor Produktivbetrieb müssen personenbezogene Zugriffe und nachvollziehbare Freigaben technisch abgesichert werden. Gemeinsame Zugangsdaten dürfen nicht zur unkontrollierten Freigabe von Kundendaten führen.
- Keine Zugangsdaten, E-Mail-Inhalte, Kundendaten oder API-Schlüssel in GitHub.
- Keine automatischen verbindlichen Zusagen oder E-Mail-Versände ohne menschliche Freigabe.
- Alle E-Mails und Anhänge werden mit eindeutiger Message-ID, Thread-ID und Zustandsprotokoll erfasst; Duplikate vermeiden.

## Module / Datenbereiche (geplant, noch nicht implementiert)
1. Mail: mail_accounts, mail_threads, mail_messages, mail_attachments, ai_drafts, send_approvals, mail_sync_runs
2. Kunden: customers, contacts, customer_notes, customer_consents
3. Anfragen: inquiries, inquiry_items, inquiry_files, inquiry_events
4. Angebote: quotes, quote_lines, quote_approvals, quote_versions
5. Aufträge: orders, order_items, payments, order_events
6. Kalender: appointments, production_jobs, production_steps, pickups
7. Lieferungen: deliveries, delivery_stops, drivers, vehicles, routes, delivery_proofs
8. Produkte/Rezepturen: products, product_variants, recipes, recipe_versions, recipe_ingredients, ingredients, supplier_prices, price_history, product_prices
9. Telefon: call_events, callbacks, call_notes (nur mit geeigneter Provideranbindung)
10. Integration: integration_outbox, integration_inbox, sync_mappings, sync_errors, audit_events
11. Administration: memberships, roles, permissions, cost_usage_daily, app_settings

## Datenhoheit und Synchronisation
- Judith AI ist führend für Kunden, Anfragen, Angebote, Aufträge, Rezepte, Produktstammdaten und freigegebene Verkaufspreise.
- GastroPilot/ETRON ist führend für tatsächlich verbuchte Umsätze und Kassenbelege.
- GastroPilot-Lieferantenbelege liefern Preisvorschläge an Judith AI; Änderung erst nach Prüfung von Artikel, Menge, Packungsgröße, Netto/Brutto.
- Integration per eindeutigen externen IDs, Idempotenzschlüssel, Änderungszeitpunkt und Audit; keine bidirektionalen Blind-Updates.
- Finanzdaten von Das Friedrich sind strikt von Judith zu trennen.

## P1 E-Mail – verbindlicher Ablauf
1. Sicheren IMAP-Empfang von easyname office@judithwalli.at serverseitig anbinden (Verbindungsdaten in Secret Store, nicht im Browser).
2. Nur neue Nachrichten importieren, Anhänge geschützt speichern, Absender und Thread erkennen.
3. KI erkennt Anliegen, fehlende Angaben, Termin und Bildanhänge; erstellt Antwortvorschlag ohne erfundene Preise.
4. Bearbeiter prüft und editiert Entwurf; Freigabe protokollieren.
5. SMTP-Versand erst nach expliziter Freigabe; Message-ID, Versandstatus und Fehler protokollieren.
6. Synchronisation mit Outlook/IMAP testen, keine Nachrichten löschen oder doppelt senden.
7. Erst mit Testnachrichten prüfen, danach begrenzter Echtbetrieb.

## Kostenkontrolle
- Keine neuen Abos oder kostenpflichtigen Provider ohne ausdrückliche Zustimmung.
- KI nur bei neuen/inhaltlich geänderten Nachrichten aufrufen; keine periodische Neuverarbeitung derselben Nachricht.
- Token- und Kostenlimit pro Tag/Monat, Modellkosten und Anzahl KI-Vorgänge im Dashboard.
- Maximale Anhanggröße, Aufbewahrungsfristen, Archivierung; Storage und Datenbanknutzung beobachten.
- Eingangs-/Ausgangs-E-Mail-Volumen, Fehlversuche und Wiederholungen überwachen.
- Budgetalarme und KI-Stopp bei Überschreitung; manueller E-Mail-Betrieb bleibt möglich.
- Bereits bestehende Verträge/Hosting und API-Guthaben gesondert erfassen; keine Kostenzusagen ohne Verbrauchsdaten.

## Freigabekriterien P1
- Login geschützt; nur autorisierte Personen sehen Kundendaten.
- Import einer Testmail mit Bildanhang funktioniert.
- KI-Vorschlag korrekt zugeordnet; Mensch kann ändern.
- Ohne Freigabe kein Versand möglich.
- Genau eine gesendete Antwort nach Freigabe, mit nachvollziehbarem Verlauf.
- Wiederholter Import erzeugt keine Duplikate.
- Keine Auswirkungen auf GastroPilot-Produktion.
- Kostenlimit und Fehleranzeige getestet.

## Reihenfolge
P0 Repository privat stellen und bestehende Berechtigungen prüfen.
P1 Mail + KI + Freigabe + Versand + Kundenbezug.
P2 Angebote, Aufträge, Abholung/Lieferung, Produktion.
P3 Rezepte, Preise, Einkauf.
P4 Telefon, Website/Shop, GastroPilot-Synchronisation.
