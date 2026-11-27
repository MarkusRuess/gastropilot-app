# Deployment-Nachweis – 27.11.2026
- PR #237 bleibt offen und als Entwurf markiert; Branch feature/social-media-zentrale.
- Supabase-Projekt gastropilot enthält die drei Social-Tabellen mit RLS. Die Spalte publish_authorized ist im Live-Schema vorhanden.
- Im Branch: geschützte Edge-Function-Implementierung, Betriebswechsel, Dashboard, Entwürfe, Freigabe-/Kalenderaktionen und PWA-Shell.
- GitHub Actions Run 46048431973, Job tests, Commit e93fe74ff8798bc26280e38c6727b797a00dfd09: erfolgreich. Unabhängiger lokaler Node-Test: 18/18 bestehende Tests bestanden; app.mjs Syntaxprüfung bestanden.
- Nicht deployed: Edge-Function und Web-App. Es gibt keinen Live-Link.
- Nicht getestet: echte Nutzeranmeldung und Trennung mit zwei unabhängigen Nutzerkonten, iPhone-Installation, Upload/Medienherkunft, Provider-OAuth, Statistiken, Bewertungen und Veröffentlichung.
- Keine Social-Provider-Autorisierung für Publishing nachgewiesen. Windsor.ai-Verbindungen sind laut bisheriger Prüfung read-only.
- Keine Produktivveröffentlichung und kein Merge; keine bestehenden GastroPilot-Anwendungen wurden geändert.
