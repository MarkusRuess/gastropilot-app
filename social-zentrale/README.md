# GastroPilot Social Media Zentrale — technische Grundlage
Stand: 2026-11-27. Status: Entwurf im isolierten Feature-Branch, nicht live.

## Bestehende Anschlüsse (Windsor.ai, read-only geprüft)
Facebook Judith / Facebook Organic Friedrich; Instagram Judith; Google Business Profile Judith, Friedrich, Markus; GA4 Judith und Friedrich. Diese Datenanschlüsse beweisen **keine Publishing-Berechtigung**.
TikTok, Pinterest, LinkedIn, YouTube, WhatsApp und weitere Konten: Autorisierung offen.

## Schutzregeln
- Mandant ist immer `business_id` mit bestehender `business_members`-Mitgliedschaft. Kein globaler Zugriff auf fremde Medien, Tokens, Beiträge oder Statistiken.
- OAuth-Tokens ausschließlich in serverseitigem Secret Store, verschlüsselt, nie im Browser oder in Logs.
- Keine automatische Veröffentlichung ohne explizite Freigabe und Plattformberechtigung.
- Originalmedien nur mit verifizierter Herkunfts-URL und Rechteprüfung; keine generierten Bilder.
- Für Veröffentlichung: transaktionale Sperre pro Mandant/Plattform/Beitrag, stabile Idempotency Keys, Retry nur nach Provider-Statusabfrage.
- Externe Plattform-APIs: Meta Graph, TikTok Content Posting, Pinterest API, LinkedIn Posts, YouTube Data, Google Business Profile, WhatsApp Business Platform — jeweils nur soweit offiziell genehmigt.
- Keine neuen kostenpflichtigen Dienste. CLI-Anything optionales lokales Werkzeug, keine Ersatz-API.
- Keine Änderung am produktiven GastroPilot bis RLS-Isolation, Freigabe-Workflow, Provider-Sandbox und UI-Abnahme bestanden sind.

## Lieferstufen
1. Schema und RLS mit zwei echten Mandantenkonten testen.
2. Redaktionskalender und Originalmedien-Referenzen.
3. Connector-Autorisierungen und read-only Kennzahlen.
4. Publishing Adapter einzeln mit ausdrücklicher Freigabe, Duplikatschutz und Fehlerjournal.
5. Mandanten-Onboarding und Dashboard; danach kontrollierte Live-Freigabe.

## Nachweis
GitHub-Dateien: implementierte Planung. Produktivtest: NICHT erfolgt. Social Publishing: NICHT aktiviert.
Quelle: unternehmenszentrale/GEMEINSAMES_WISSEN.md (GR-01 bis GR-05, 27.11.2026).
