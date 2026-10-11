# GastroPilot BONit - historischer Tagesabschlussimport seit 2020
# Liest nur die vorhandene Exportdatei; keine Aenderung am Kassensystem.
$ErrorActionPreference='Stop'
$root='C:\GastroPilot\Export'
$name='Tagesabschl'+[char]0x00FC+'sse.csv'
$file=Get-ChildItem -LiteralPath $root -Recurse -File -Filter $name | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if(!$file){throw 'BONit-Tagesabschlussdatei nicht gefunden'}
$keyPath='C:\GastroPilot\Scripts\device-key.dat'
$secure=(Get-Content -LiteralPath $keyPath | Select-Object -First 1).Trim() | ConvertTo-SecureString
$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try{$token=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}
$url='https://sjnwfwcpgwsavygewwzb.supabase.co/functions/v1/bonit-import'
$culture=[Globalization.CultureInfo]::GetCultureInfo('de-AT')
$rows=New-Object 'System.Collections.Generic.List[object]'
$seen=New-Object 'System.Collections.Generic.HashSet[string]'
$count=0
function Num([string]$value){if([string]::IsNullOrWhiteSpace($value)){return $null};return [decimal]::Parse($value,$culture)}
function SendRows {
 if($rows.Count -eq 0){return}
 $body=@{type='closings';rows=@($rows.ToArray())}|ConvertTo-Json -Depth 5 -Compress
 $result=Invoke-RestMethod -Method Post -Uri $url -Headers @{'x-bonit-device-token'=$token} -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 90
 if($result.ok -eq $false){throw ('Server meldet Fehler: '+($result|ConvertTo-Json -Compress))}
 $script:count+=$rows.Count
 Write-Host "Uebertragene Tagesabschluesse: $script:count"
 $rows.Clear()
}
Import-Csv -LiteralPath $file.FullName -Delimiter "`t" -Encoding Default | ForEach-Object {
 if(!$_.ID -or !$_.DatumDurchfuehrung){return}
 $id=[string]$_.ID
 if(!$seen.Add($id)){return}
 $date=[datetime]::Parse([string]$_.DatumDurchfuehrung,$culture).ToString('yyyy-MM-dd')
 $rows.Add([pscustomobject]@{z_number=$id;closing_date=$date;gross_amount=(Num $_.Summe);net_amount=$null;cash_amount=(Num $_.Summebar);card_amount=(Num $_.SummeUnbar);receipt_count=[int]$_.AnzahlRechnungen})
 if($rows.Count -ge 200){SendRows}
}
SendRows
Write-Host "FERTIG: $count historische BONit-Tagesabschluesse uebertragen."
