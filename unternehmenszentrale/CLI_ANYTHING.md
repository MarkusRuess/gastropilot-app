# CLI Anything – Einbindung in die KI Unternehmenszentrale

Stand: 27.11.2026. Quelle: [HKUDS/CLI-Anything](https://github.com/HKUDS/CLI-Anything), geprüfter Commit `34f519533bc175d2fe287ab8316b0dd99bb9cc43`.

## Einsatz

1. Für GitHub, Supabase und WordPress die vorhandenen MCP-Verbindungen und deren Berechtigungen verwenden.
2. Nur wenn eine konkret benötigte Funktion darüber nicht verfügbar ist, einen lokalen CLI-Anything-Harness für die betreffende Software planen. Vorher vorhandene CLIs und Implementierungen prüfen.
3. Das betroffene Backend und seine Lizenz prüfen. Nur vorab geprüfte, kostenfreie Abhängigkeiten installieren; keine automatischen Hub-Installationen.
4. Zuerst offline mit synthetischen Daten, dann gegen das echte lokale Backend testen. Produktive Schreibrechte und Deployments erst nach nachgewiesener Mandantentrennung, Zugriffsprüfung und erfolgreichen Tests aktivieren.
5. Wiederverwendbar sind nur generische Befehle, anonymisierte Testdaten und überprüfte Regeln. Betriebsdaten und Geheimnisse bleiben in ihren bisherigen Systemen und Berechtigungsbereichen.

## Technischer Status

| Punkt | Tatsächlicher Stand |
| --- | --- |
| Upstream-Lizenz | Apache-2.0 für das Hauptrepository; `cli-hub/setup.py` deklariert MIT für den separaten Paketmanager. Keine Fremdsoftware in GastroPilot eingebettet. |
| Quellcode | Codex-Installationsskript, Methodik, Sicherheitsrichtlinien und Paketmetadaten am genannten Commit geprüft. Ausführbare Harnesses benötigen jeweils eine eigene Prüfung. |
| Abhängigkeiten | Codex-Methodik ist dokumentenbasiert; für erzeugte Python-Harnesses nennt Upstream Python >=3.10, Click und pytest. Im geprüften Laufzeit-Container: Python 3.12.14, Click 8.4.2, pytest nicht installiert. |
| Installation | Persönliche, wiederverwendbare Codex-Methodik als Dokumentation gespeichert. Kein globales `cli-anything`-Programm, kein `cli-hub`-Paket und kein anwendungsspezifischer Harness installiert. |
| Test | Upstream-Installer in isoliertem Verzeichnis: bestanden; Python-Syntaxprüfung der mitgelieferten Hilfsskripte: bestanden; Skill-Formatprüfung: bestanden. Keine produktiven Daten oder APIs verwendet. |
| Aktivierung | Nur die Dokumentation ist verfügbar. Keine Änderungen an Supabase, WordPress, Frontend, Edge Functions oder produktiven Automatisierungen. |

## Sicherheitsgrenzen

- Niemals API-Schlüssel, Bank-, Personal- oder Kundendaten in CLI-Protokolle, gemeinsame Skills, GitHub oder Test-Fixtures übernehmen.
- Kein automatisches Nachladen und Ausführen von Drittanbieter-Harnesses. Subprozesse ohne Shell und mit geprüften Argumenten ausführen; Ausgabepfade und Rechte begrenzen.
- Kein kostenpflichtiger KI-Aufruf über CLI Anything. Der bestehende serverseitige KI-Guard mit `paid_enabled=false` bleibt maßgeblich; ein CLI darf ihn nicht umgehen.
- Jeder künftige Harness erhält eigene Tests für Mandantenzuordnung, fehlende Berechtigung, Fehlerfall und Kostenfreiheit. Live-Status erst nach separater Prüfung der echten Funktion melden.

## Nächster konkreter Einsatz

Bei einer nachgewiesenen Lücke der vorhandenen MCP-Schnittstellen zuerst einen einzelnen Offline-Harness mit minimalem Befehlsumfang auf einem eigenen PR entwickeln und testen. Kein generischer Vollzugriff auf die drei Unternehmen.
