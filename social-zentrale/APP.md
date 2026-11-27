# GastroPilot Social – App-Status
Die Oberfläche im Feature-Branch ist auf mobile Nutzung ausgelegt. Web-App-Manifest, Symbol, Apple-Touch-Icon-Verweis und Service Worker sind vorhanden. Der Service Worker speichert nur den App-Shell-Code, keine Beiträge, Kundendaten oder Zugangsdaten.

Anmeldung verwendet bestehende Supabase-Konten; Betriebswechsel folgt business_members. Entwürfe und Freigabeaktionen sind im Branch integriert. Der interne Kalender ist keine Veröffentlichung.

Noch offen: HTTPS-Hosting mit dauerhaftem Link, Deployment der isolierten Edge-Function, Echtkonto- und Fremdmandantentest, Test auf einem iPhone und OAuth-/Provider-Freigaben. Bis dahin ist die App nicht produktiv nutzbar und darf nicht als live bezeichnet werden.
