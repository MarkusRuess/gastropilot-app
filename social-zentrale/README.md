# GastroPilot Social
Stand: 27.11.2026 · Umsetzung im offenen PR #237 / Branch feature/social-media-zentrale.

## Im Branch umgesetzt
- Anmeldemaske für bestehende Supabase-Konten und Wechsel zwischen zugeordneten Betrieben.
- Übersicht, Social-Kanalstatus, Beitragsentwürfe, Freigabe-Übergang und interner Monatskalender.
- Schreibaktionen laufen über eine Edge-Function, die den angemeldeten Nutzer und seine Betriebsmitgliedschaft vor jeder Aktion prüft. Freigeben und Terminieren ist auf Betriebsinhaber und Administratoren beschränkt.
- PWA-Grunddateien und mobil angepasste Oberfläche; kein vertraulicher Offline-Cache.
- Keine generierten Bilder. Medien-Upload bleibt gesperrt, bis Originalherkunft und Rechteprüfung verfügbar sind.

## Noch nicht produktiv
Der Branch ist nicht live. Die Edge-Function ist nicht deployed und es gibt noch keinen eigenständigen App-Link.
Kalendereinträge sind interne Planung; sie lösen keine Veröffentlichung aus. Es existiert kein atomarer Veröffentlichungs-Claim und kein Provider-Adapter in Produktion.
Windsor.ai ist laut bisheriger Prüfung read-only und belegt keine Berechtigung zum Veröffentlichen. CLI Anything liefert keine Plattformberechtigungen und wird hier nicht zusätzlich installiert.

## Vor Produktivsetzung erforderlich
- Deployment/Hosting für einen dauerhaften HTTPS-Link und Test der iPhone-Installation.
- Getrennter Echtkonto-Test mit einem erlaubten und einem fremden Betriebskonto.
- OAuth-App-Konfiguration, Plattformfreigaben und Kontozustimmung für jeden offiziellen Anbieter.
- Originalmedien-Upload, Herkunfts- und Rechteprüfung.
- Transaktionaler Doppelveröffentlichungsschutz, Statusabgleich und echte Provider-Sandbox-Tests.
- Statistiken, Bewertungen und verlässliche Kunden-Onboarding-Rollen.

Keine neue kostenpflichtige Infrastruktur wurde angelegt. Keine bestehenden GastroPilot-Anwendungen wurden geändert.
