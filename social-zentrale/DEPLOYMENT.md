# Deployment-Nachweis – 27.11.2026
- PR #237 bleibt offen und als Entwurf markiert; Branch feature/social-media-zentrale.
- Supabase-Projekt gastropilot enthält drei Social-Tabellen mit RLS; publish_authorized ist im Live-Schema vorhanden.
- Im Feature-Branch: Oberfläche, Betriebswechsel, Entwürfe, Freigabe-/Kalenderaktionen und PWA-Shell.
- Supabase Edge Function social-zentrale, Version 1, Status ACTIVE, verify_jwt=true.
- Anonymer HTTP-GET-Smoke-Test gegen die Function: 401. Das belegt die Ablehnung anonymer Requests; ein authentifizierter Lese-/Schreibtest mit getrennten Konten fehlt.
- GitHub Actions Run 46049070929 auf Commit 137acc116f95da89541f892b0139941952751982: erfolgreich. Lokaler Node-Test: 18/18 bestehende Tests; app.mjs Syntaxprüfung erfolgreich.
- Hostinger: isolierter Zielordner /social auf genussweltbaden.at war nicht vorhanden; Root-Deployment wurde vermieden. Hosting-Deploy aus dem gefilterten Branch deploy/social-zentrale scheiterte mit „No active Git installation“. Hostinger meldet, dass GitHub einmal in hPanel unter Websites → Manage → Advanced → Git verbunden werden muss.
- Keine Web-App-Dateien deployed; es gibt keinen App-Link. Bestehende WordPress-Inhalte unverändert.
- Offen: separater Konto-/Mandantentest, Originalmedienprüfung, OAuth/Provider-Schreibzugriff in der Web-App, Idempotency und Statusabgleich, Statistiken/Bewertungen, iPhone-Installation.
