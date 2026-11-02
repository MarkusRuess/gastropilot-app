# GastroPilot KI-Team – Aufgabensteuerung (Entwicklungsstand)

Stand: 2026-11-02. **Organisations- und Einrichtungsdokument, kein aktiver autonomer Agent.**

## Zuständigkeiten
- **Kontrolle GastroPilot**: unabhängige read-only Sicherheits-, Qualitäts- und Fortschrittskontrolle; Aufgaben priorisieren, Befunde dokumentieren, Freigabe empfehlen, nicht selbst produktiv ändern.
- **GastroPilot Zentrale**: gemeinsame Navigation, Dashboard, Infrastruktur, Mandantentrennung, Schnittstellen.
- **GastroPilot Friedrich**: ausschließlich Friedrich-Funktionen und betriebliche Datenpfade.
- **GastroPilot Judith**: ausschließlich Judith-Finanzen, Bankimport, Rechnungserkennung und Judith-AI-Schnittstelle.
- **Judith AI**: Kunden, Aufträge, Kalender, Mitarbeiterrechte, lesende Zahlungseingänge.
- **Marketing & Websites**: erst nach separater Konten-/Plattformprüfung und Einwilligung einrichten.

## Gemeinsame Arbeitsgrundlage
- Repository: MarkusRuess/gastropilot-app.
- Projektübersicht: PROJEKTUEBERSICHT_GESAMT.md.
- Projektstände: PROJEKTSTAND_ZENTRALE.md, PROJEKTSTAND_FRIEDRICH.md, PROJEKTSTAND_JUDITH.md, PROJEKTSTAND_JUDITH_AI.md.
- QA: QUALITAETSSICHERUNG.md.
- Koordinationsauftrag: GitHub Issue #52.

## Standardablauf
1. Ein GitHub-Issue pro abgrenzbarer Aufgabe, ohne Dubletten; Zuständigkeit, betroffener Betrieb, Risiko und Abnahmekriterien festhalten.
2. Entwicklungsagent **erst nach gesonderter Einrichtung und Autorisierung**; ausschließlich isolierter Entwicklungsbranch, PR statt Direktänderung am main.
3. CI-Checks und unabhängige Prüfung der betroffenen Funktionen und Mandantengrenzen.
4. Projektstanddateien und ggf. gemeinsame Übersicht bei Änderungen aktualisieren.
5. **Kein automatischer Merge, Deployment, produktiver Datenbankeingriff, Rechtewechsel oder Social-Media-Post.** Freigabe durch Eigentümer erforderlich.

## Status / Grenzen
- Die ChatGPT-Projekte sind getrennte Arbeitsräume, keine selbständig kommunizierenden Agenten.
- Die tägliche read-only Sicherheitskontrolle ist bereits als ChatGPT-Automation eingerichtet.
- Agentenanbindung, Issue-Routing, End-to-End-Tests, Deployment-Freigabeprozess und Marketingkonten sind **noch nicht technisch aktiviert**.
- Supabase-Daten, Berechtigungen, Secrets und Produktivsystem bleiben unverändert.

## Nächste Schritte
1. Vorhandene Issues auf Zuständigkeit und Priorität prüfen; #52 als Koordinationsreferenz.
2. GitHub-/Codex-Agentenanbindung mit begrenzten Berechtigungen und Entwicklungsbranch testen.
3. PR-Pflicht, CI und Branchschutz überprüfen; E2E-/RLS-Tests in isolierter Umgebung ergänzen.
4. Erst danach Pilotauftrag mit risikoarmer Dokumentationsänderung ausführen und abnehmen.
