# GastroPilot – Abnahmeplan für Sonntag, 11.10.2026

**Status:** Vorbereitet, nicht abgenommen. **Keine Kassenanbindung vor gemeinsamer Freigabe.**

## 0. Datenschutz vor dem Test
- Nur notwendige Originale verwenden; Personalunterlagen enthalten vertrauliche Daten.
- Supabase Auth: *Leaked password protection* prüfen und aktivieren, wenn verfügbar.
- Supabase: MFA für Inhaber prüfen; getrennte Logins, keine Passwortweitergabe.
- Rollen prüfen: Judith nur J.W. GmbH, kein Zugriff auf Das Friedrich; Einladung office@judithwalli.at wurde noch nicht versendet.
- Prüfen: AVV/DPA mit Hosting-/Cloud-Anbietern, Lösch-/Aufbewahrungsfristen, Betroffenenrechte, Backup-Konzept und Zugriffsdokumentation. Eine technische Prüfung ersetzt keine juristische DSGVO-Freigabe.
- Keine sensiblen Originale in GitHub, Screenshots oder öffentlich zugängliche Links stellen.

## 1. Bereitzulegen
- Je Betrieb: aktueller Bankauszug (PDF; möglichst auch CSV/CAMT falls vorhanden), tatsächlicher Bank- und Kassastand.
- 3–5 Lieferantenrechnungen samt zugehörigen Buchungen: bezahlt, offen, Teilzahlung, Sammelzahlung, Gutschrift, Doppelbeleg.
- Saldenliste und Lohn-/Zahlungsliste eines klar bezeichneten Monats (für den Test möglichst anonymisiert).
- Tatsächliche Zahlen der Steuerberatung als Kontrollsumme.
- Zugang als Inhaber sowie zweiter Testnutzer mit eingeschränktem Betriebszugriff.

## 2. Testreihenfolge und Freigabekriterien
1. **Anmeldung & Mandantentrennung:** Inhaber sieht nur berechtigte Betriebe; anderer Benutzer sieht ausschließlich eigenen Betrieb; keine fremden Daten über direkte Abfragen/URLs.
2. **Originalarchiv:** PDF hochladen, in Liste wiederfinden, über kurzlebigen Link öffnen, falschen Betrieb und nicht berechtigten Nutzer blockieren. Dateitypen/-größen prüfen.
3. **Bankerkennung:** Einfache Zeilen erkennen; Mehrbetragszeilen, Vorzeichen, Datumsformate, doppelte Buchungen, Scans und CSV/CAMT separat prüfen. Derzeit keine Garantie für alle Bankformate.
4. **Rechnungsabgleich:** 1:1, Teilzahlung, Sammelzahlung, Gutschrift, doppelter Beleg, zwei gleiche Beträge, betriebsfremde Rechnung, zu hohe Zuordnung. Keine automatische Markierung „bezahlt“ ohne explizite Bestätigung.
5. **Personal & Saldenliste:** Beträge, Monate, Lohnnebenkosten, offene Zahlungen und Konten anhand Originalen verifizieren.
6. **Liquidität:** Kontostände und 30-Tage-/13-Wochen-Vorschau manuell gegenprüfen. Doppelzählungen zwischen Fixkosten, Rechnungen, Löhnen und Zahlungsplan ausschließen. Ohne vollständige Daten keine verlässliche Liquiditätsfreigabe.
7. **Backup & Restore:** Nachweis der tatsächlichen Sicherung und kontrollierter Wiederherstellung (nicht an Live-Daten testen).
8. **Geräte:** iPhone, Tablet, Computer; Login, Upload, Originalansicht, Scrollen, Betriebswechsel.
9. **Kasse:** Morgen gemeinsam separat entscheiden und anbinden; APRO/ETRON erst nach bestätigtem Format, Berechtigungen und Dublettenstrategie.

## 3. Fehlerprotokoll
| Nr. | Betrieb | Testfall | Erwartet | Tatsächlich | Status | Maßnahme |
|---|---|---|---|---|---|---|
| 01 | Beide | Berechtigung | Fremde Daten unsichtbar | Noch nicht getestet | OFFEN | |
| 02 | Beide | Originalablage | Upload + erneutes Öffnen | Noch nicht getestet | OFFEN | |
| 03 | Beide | Bankimport | Jede Buchung korrekt | Noch nicht getestet | OFFEN | |
| 04 | Beide | Rechnungsabgleich | Kein Doppelmatch | Noch nicht getestet | OFFEN | |
| 05 | Beide | Personal / Saldenliste | Summen stimmen | Noch nicht getestet | OFFEN | |
| 06 | Beide | Liquidität | Mit Kontrollrechnung identisch | Noch nicht getestet | OFFEN | |
| 07 | Beide | Backup / Restore | Wiederherstellung nachgewiesen | Noch nicht getestet | OFFEN | |
| 08 | Beide | Mobil / Desktop | Nutzbar | Noch nicht getestet | OFFEN | |

## 4. Go/No-Go
**GO** erst nach bestandenen Kernprüfungen, dokumentierter Rollenprüfung, Datenschutz- und Backup-Freigabe und nachvollziehbarem Abgleich mit Steuerberatung/Bank. Andernfalls **NO-GO für automatische Finanzentscheidungen**, aber kontrollierte Erfassung und Tests möglich.

Arbeitsoberfläche: https://markusruess.github.io/gastropilot-app/management.html
