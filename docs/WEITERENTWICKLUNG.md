# GastroPilot – Weiterentwicklung

## Unverändert lassen
- Bestehendes Dashboard und seine Kennzahlen.
- Vier Hauptkacheln im 2×2-Raster.
- Bestehende Erfassung und Archive für Tagesabrechnungen und Lieferantenrechnungen.

## Geplante Verwaltungsbereiche
1. Liquidität: bestätigte Bank- und Kassastände, offene Ein- und Auszahlungen, 30-Tage-Prognose.
2. Fixkosten: monatliche Kosten, Fälligkeit, Zahlungsstatus.
3. Offene Zahlungen: Fälligkeiten und Erledigungsstatus; keine Doppelbuchungen.
4. Personal: monatliche Lohn- und Dienstgeberkosten, geschütztes Archiv für Lohndeckblätter.

## Sicherheits- und Qualitätsregeln
- Neue Funktionen zunächst in einem separaten Branch und als Pull Request.
- Live-Version erst nach Prüfung ändern.
- Rollenprüfung und Supabase-RLS für sämtliche Unternehmensdaten.
- Personaldokumente nur in privatem Storage mit restriktiven Zugriffsrechten.
- Keine Schätzwerte als Ist-Werte ausgeben.
- Keine doppelte Verbuchung von Rechnungen, Fixkosten und Zahlungen.
- Modulweise Umsetzung in getrennten Dateien statt fortlaufend wachsender index.html.

## Status
Plan dokumentiert. Funktionen sind noch nicht implementiert oder getestet.
