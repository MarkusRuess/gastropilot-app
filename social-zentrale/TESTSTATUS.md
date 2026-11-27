# Verifizierter Teststatus – 27.11.2026
- GitHub Actions Run 46048431973 auf Branch feature/social-media-zentrale, Commit e93fe74ff8798bc26280e38c6727b797a00dfd09: erfolgreich. Der Workflow-Schritt node --test social-zentrale/publishing.test.mjs social-zentrale/dashboard.test.mjs social-zentrale/business-switch.test.mjs war erfolgreich.
- Unabhängiger lokaler Lauf derselben Tests: 18 bestanden, 0 fehlgeschlagen.
- node --check app.mjs: erfolgreich.
- Geprüft sind reine Geschäftslogik und Modulsyntax. Die Edge Function wurde nicht deployed oder separat typgeprüft.
- Offen: echte Supabase-Anmeldung mit getrennten Nutzern, Berechtigungstest über die Funktion, PWA-Installation auf iPhone, Medienprovenienz, atomarer Veröffentlichungs-Claim, Provider-OAuth und echte Veröffentlichung.
- CI-Erfolg beweist keine Live-Abnahme. PR #237 bleibt Entwurf.
