# Judith AI × GastroPilot – Projektstruktur
Stand: 28.10.2026

## Ziel
Handschriftliche A4-Aufträge fotografieren, strukturiert erfassen und auswerten. Judith AI verwaltet Kunden, Anlässe, Torten und Termine. GastroPilot berechnet Kosten, Umsatzbedarf und Ergebnis. Judith und Das Friedrich strikt getrennt.

## Datenfluss
1. A4-Auftrag fotografieren.
2. Erkennung: Besteller, Telefon, E-Mail, Anlassperson, Anlass, Termin, Torte (= Tortensorte), Größe, Stückzahl, Füllung, Dekoration, Preis, Anzahlung, Abholung/Lieferung.
3. Unleserliche Angaben als OFFEN markieren; keine erfundenen Daten. Doppelerkennung vor Speicherung.
4. Auftrag prüfen und bestätigen; im Kalender anzeigen.
5. Nach Verkauf Kassendaten abgleichen. Auftragswert NICHT zusätzlich zum Kassenumsatz zählen.
6. Monatlich Anzahl Torten je Sorte, Umsatz je Sorte, Durchschnittspreis, Auftragsstatus und Produktionsbelastung auswerten.
7. GastroPilot: Nettoumsatz aus Kasse, Wareneinsatz aus Rechnungen/Rezepte, Personal, Miete, Fixkosten; Sollumsatz und voraussichtliches Ergebnis.

## Rollen
Judith AI = CRM, Aufträge, Produktion, Terminplanung, Kundenanlässe.
GastroPilot = Betriebswirtschaft, tatsächliche Umsätze, Kosten, Deckungsbeiträge, Sollumsatz.
Keine Vermischung mit Das Friedrich.

## Datenmodell (Ziel)
Kunden: Besteller mit Kontaktdaten und Kommunikations-Einwilligung.
Anlässe: Anlassperson getrennt vom Besteller, Datum, Art, jährliche Wiederkehr.
Aufträge: Datum, Status, Abholung/Lieferung, Preis, Anzahlung, bezahlt.
Auftragspositionen: Tortensorte (= Torte), Menge, Größe, Füllung, Dekoration, Produktionsminuten, Zutatenkosten.
Belege: Originalfoto, Erkennungsstatus, Prüfstatus.
Kassenabgleich: eindeutige Referenz, gegen Doppelzählung.

## Bestehender Stand
Live: judith-ai/postfach.html mit Kunden, Anfragen/Aufträgen und Monatskalender. Supabase Tabellen judith_ai_customers, judith_ai_inquiries, judith_ai_attachments. Bereich Produktion & Umsatzbedarf als Erläuterung eingebaut. Keine vollständige Foto-Extraktion oder automatische betriebswirtschaftliche Verbindung vorhanden.

## Planwerte – vorläufig, nicht Ist-Ergebnis
Judith: Personal September 19.958,75 EUR; Miete ca. 5.000 EUR; sonstige Kosten 4.000 EUR geschätzt; Wareneinsatz 26 % vom Netto; Ziel 5.000 EUR Gewinn vor Steuern; Brutto-Wachstumsziel 60.000 EUR. Modellrechnung: Gewinnschwelle ca. 43.400 EUR brutto; für 5.000 EUR Gewinn ca. 50.800 EUR brutto. Umsatzsteuer-Mix und Kosten laufend verifizieren.

## Umsetzung in Etappen
P1: Auftragsformular/Fotoerfassung mit Freigabe und Tortensorten-Katalog.
P2: Kalender, Auftragspositionen und Monatsstatistik mit Ist-Daten.
P3: Umsatz/Kosten-Schnittstelle zu GastroPilot mit Abgleich.
P4: Kundenanlässe, Wiedervorlage einen Monat vorher (nur mit geeigneter Kontakt-Einwilligung).
P5: Tortenkalkulation nach Zutaten und Arbeitszeit.

## Qualität
Alle Zahlen mit Zeitraum, Betrieb und Status (Ist/Schätzung/offen). Keine unbestätigte Anfrage als Verkauf. Keine Speicherung unleserlicher Werte als Tatsachen. Datenschutz und Zugriffsrechte vor Kundendatenimport prüfen.
