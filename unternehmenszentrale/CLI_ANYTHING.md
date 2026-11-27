# CLI Anything – Einbindung in die KI Unternehmenszentrale

Stand: 27.11.2026. Quelle: [HKUDS/CLI-Anything](https://github.com/HKUDS/CLI-Anything), geprüfter Commit `34f519533bc175d2fe287ab8316b0dd99bb9cc43`.

## Dauerhaft nutzbares Programm

Der in diesem Repository versionierte [Enterprise CLI Harness](cli-anything/enterprise_cli.py) enthält drei fest erlaubte, lokale Prüfpfade: `zentrale`, `judith` und `friedrich`. Er verwendet ausschließlich Python-Standardbibliothek und das vorhandene Node.js 24; er benötigt weder CLI-Hub, API-Schlüssel noch eine Installation in ChatGPT Work.

```bash
git clone https://github.com/MarkusRuess/gastropilot-app.git
cd gastropilot-app
bash unternehmenszentrale/cli-anything/install.sh "$HOME/.local"
"$HOME/.local/bin/uz-cli" list
"$HOME/.local/bin/uz-cli" --json check --project friedrich
```

Der Installer verweigert das Überschreiben eines fremden Programms und erkennt eine bestehende identische Installation. Für Tests kann ein temporärer Installationspfad statt `$HOME/.local` angegeben werden. Die Installation verweist auf den lokalen Checkout: nach dessen Verschieben den Installer erneut im neuen Checkout und mit einem neuen Installationspfad ausführen.

Der CLI-Harness führt ausschließlich drei im Code festgelegte, synthetische Node-Tests in getrennten Prozessen aus. Ein Projektname ist eine feste Auswahl; beliebige Befehle, Dateipfade, Datenbankzugriffe und produktive Schreiboperationen sind nicht verfügbar. Der Kindprozess erhält keine Tokens oder Zugangsdaten aus der Umgebung. Zur Nutzung in anderen Chats muss dort entweder ein Ausführungsumfeld mit Repository-Checkout vorhanden sein oder das Ergebnis in GitHub Actions gelesen werden. Eine GitHub-MCP-Verbindung allein kann keine beliebigen lokalen Befehle ausführen.

## Unabhängige Ausführung

- [CI für Enterprise CLI](../.github/workflows/qa-enterprise-cli.yml): bei Änderungen am Programm als Pull-Request mit drei getrennten Projekt-Jobs; auch manuell im GitHub-Actions-Menü startbar. `contents: read`, keine Secrets, keine Deployments.
- [Bestehende tägliche Zentrale-QA](../.github/workflows/qa-unternehmenszentrale.yml): führt zusätzlich Judith- und Friedrich-Prüfungen über dasselbe Programm aus. GitHub Actions läuft ohne Work-Chat. Bestehende ChatGPT-Automatisierungen können die GitHub-Ergebnisse über die GitHub-Schnittstelle lesen; ihr eigener ChatGPT-Lauf verbraucht weiterhin Work. Sie können nicht selbst über die GitHub-MCP-Verbindung den CLI-Prozess starten.
- Der echte Funktionstest umfasst Installer-Erstlauf und Wiederholung, die drei Projektprüfungen und vier Sicherheits-/Befehlstests. Die GitHub-Actions-Prüfung wird erst nach erfolgreichem CI-Lauf als extern ausgeführt bestätigt.

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
| Installation | Persönliche, wiederverwendbare Codex-Methodik als Dokumentation gespeichert. Der GastroPilot-spezifische Offline-Prüfharness und sein Installer liegen zusätzlich im Repository; `cli-hub` und ein globales Upstream-Programm sind nicht installiert. |
| Test | Upstream-Installer in isoliertem Verzeichnis: bestanden; Python-Syntaxprüfung der mitgelieferten Hilfsskripte: bestanden; Skill-Formatprüfung: bestanden. Keine produktiven Daten oder APIs verwendet. |
| Aktivierung | Nur die synthetischen Offline-Prüfungen sind für GitHub Actions vorgesehen. Keine Änderungen an Supabase, WordPress, Frontend, Edge Functions oder deren produktiven Berechtigungen. |

## Sicherheitsgrenzen

- Niemals API-Schlüssel, Bank-, Personal- oder Kundendaten in CLI-Protokolle, gemeinsame Skills, GitHub oder Test-Fixtures übernehmen.
- Kein automatisches Nachladen und Ausführen von Drittanbieter-Harnesses. Subprozesse ohne Shell und mit geprüften Argumenten ausführen; Ausgabepfade und Rechte begrenzen.
- Kein kostenpflichtiger KI-Aufruf über CLI Anything. Der bestehende serverseitige KI-Guard mit `paid_enabled=false` bleibt maßgeblich; ein CLI darf ihn nicht umgehen.
- Jeder künftige Harness erhält eigene Tests für Mandantenzuordnung, fehlende Berechtigung, Fehlerfall und Kostenfreiheit. Live-Status erst nach separater Prüfung der echten Funktion melden.

## Nächster konkreter Einsatz

Der hier implementierte Prüf-Harness kann bereits drei Projekte ohne Work testen. Bei einer weiteren nachgewiesenen Lücke der vorhandenen MCP-Schnittstellen einen einzelnen zusätzlichen Befehl mit minimalem Umfang auf eigenem PR entwickeln und testen. Kein generischer Vollzugriff auf die Unternehmen.
