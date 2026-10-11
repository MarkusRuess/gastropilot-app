# GastroPilot - Starthelfer fuer historischen BONit-Import
# Am BONit-Windows-PC ausfuehren, nicht am iPhone.
$ErrorActionPreference='Stop'
Write-Host 'GastroPilot | Historische Tagesabschluesse ab 2020' -ForegroundColor Cyan
$root='C:\GastroPilot\Export'
$key='C:\GastroPilot\Scripts\device-key.dat'
$name='Tagesabschl'+[char]0x00FC+'sse.csv'
if(!(Test-Path -LiteralPath $root)){throw "Exportordner fehlt: $root"}
if(!(Test-Path -LiteralPath $key)){throw "Geraeteschluessel fehlt: $key. Bitte nicht per Chat verschicken."}
$csv=Get-ChildItem -LiteralPath $root -Recurse -File -Filter $name | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if(!$csv){throw 'Tagesabschluesse.csv wurde im Exportordner nicht gefunden.'}
Write-Host ('Exportdatei: '+$csv.FullName)
Write-Host ('Dateigroesse: '+[math]::Round($csv.Length/1KB)+' KB')
$head=Get-Content -LiteralPath $csv.FullName -TotalCount 1 -Encoding Default
if($head -notmatch 'DatumDurchfuehrung' -or $head -notmatch 'Summe'){throw 'CSV-Spalten passen nicht zum erwarteten BONit-Export. Import gestoppt.'}
if($head -notmatch "`t"){throw 'CSV ist nicht tabulatorgetrennt. Import gestoppt, damit keine falschen Daten entstehen.'}
$script='C:\GastroPilot\Scripts\upload-all-closings.ps1'
if(!(Test-Path -LiteralPath $script)){throw "Importskript fehlt: $script. Lade bonit/upload-all-closings.ps1 aus GitHub herunter und speichere es dort."}
Write-Host 'Vorpruefung bestanden. Das Skript schreibt nichts in die BONit-Kasse.'
$confirm=Read-Host 'Jetzt historische Tagesabschluesse an GastroPilot senden? JA eingeben'
if($confirm -cne 'JA'){Write-Host 'Abgebrochen. Keine Daten gesendet.';exit}
& $script
if(!$?){throw 'Der Import wurde mit einem Fehler beendet.'}
Write-Host 'Importlauf beendet. Bitte Werte im Dashboard kontrollieren.' -ForegroundColor Green
