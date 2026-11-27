# GastroPilot Social
Stand: 27.11.2026 · Umsetzung im offenen PR #237 / Branch feature/social-media-zentrale.

## Im Branch umgesetzt
- Anmeldemaske für bestehende Supabase-Konten und Wechsel zwischen zugeordneten Betrieben.
- Übersicht, Social-Kanalstatus, Beitragsentwürfe, Freigabe-Übergang und interner Monatskalender.
- Schreibaktionen laufen über eine Edge-Function, die den angemeldeten Nutzer und seine Betriebsmitgliedschaft vor jeder Aktion prüft. Freigeben und Terminieren ist auf Betriebsinhaber und Administratoren beschränkt.
- PWA-Grunddateien und mobil angepasste Oberfläche; kein vertraulicher Offline-Cache.
- Keine generierten Bilder. Medien-Upload bleibt gesperrt, bis Originalherkunft und Rechteprüfung verfügbar sind.

## Windsor.ai / Plattformen
Die verbundene Windsor.ai-Integration meldet Schreibaktionen für einzelne Social-Konnektoren, zusätzlich zu Analytics-Lesezugriffen. Diese MCP-Werkzeuge können aus ChatGPT ausgeführt werden; sie stellen der eigenständigen Web-App jedoch keine API-Credentials oder aufrufbare Publishing-Schnittstelle bereit.
Provider-Accounts und App-Freigaben für die Web-App sind daher weiterhin offen. Keine Inhalte wurden veröffentlicht.

## Noch nicht produktiv
Der Branch ist nicht live. Die Edge-Function ist nicht deployed und es gibt noch keinen eigenständigen App-Link.
Kalendereinträge sind interne Planung; sie lösen keine Veröffentlichung aus. Es existiert kein atomarer Veröffentlichungs-Claim und kein Provider-Adapter in Produktion.
CLI Anything liefert keine Provider-Autorisierung und wird hier nicht zusätzlich installiert.

## Vor Produktivsetzung erforderlich
- Deployment/Hosting für einen dauerhaften HTTPS-Link und Test der iPhone-Installation.
- Getrennter Echtkonto-Test mit einem erlaubten und einem fremden Betriebskonto.
- Sichere Provider-API-Anbindung und Kontozustimmung für jeden Kanal; nicht verbundene Konten brauchen OAuth.
- Originalmedien-Upload, Herkunfts- und Rechteprüfung.
- Transaktionaler Doppelveröffentlichungsschutz, Statusabgleich und echte Provider-Sandbox-Tests.
- Statistiken, Google-Bewertungen und verlässliche Kunden-Onboarding-Rollen.

Keine neue kostenpflichtige Infrastruktur wurde angelegt. Keine bestehenden GastroPilot-Anwendungen wurden geändert.
