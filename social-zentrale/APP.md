# GastroPilot Social – App-Status
Stand: 28.11.2026 · PR #237 bleibt offen als Entwurf.

Die isolierte PWA ist unter https://genussweltbaden.at/social/ live. Der Unterordner wurde über den bestehenden Hostinger-Git-Eintrag deployt; das WordPress-Stammverzeichnis wurde nicht verändert. Die Supabase-Edge-Function social-zentrale ist aktiv (Version 1, JWT-Prüfung an); die drei Social-Tabellen und ihre RLS-Regeln sind im gemeinsamen Projekt vorhanden.

Login nutzt den vorhandenen GastroPilot-Supabase-Zugang und die Betriebszuordnung aus business_members. Das Loginformular verhindert eine Formularübermittlung, falls das Modul nicht lädt, zeigt Modul-/Netzwerk-/Zugangsdatenfehler getrennt an und speichert keine Posts oder Zugangsdaten im Offline-Cache. Service-Worker v3 aktualisiert Login-Seite und Login-Modul netzwerkpriorisiert. Ein echter Login auf einem iPhone wurde bewusst noch nicht ausgeführt.

Entwürfe, Betriebswechsel und Freigabe-/Kalenderaktionen sind integriert. Kalendertermine sind interne Planung und lösen keine Veröffentlichung aus. Medien-Upload bleibt gesperrt, bis Originalherkunft und Rechteprüfung verfügbar sind.
