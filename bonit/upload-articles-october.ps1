# GastroPilot BONit: Oktober-Artikel importieren
$ErrorActionPreference='Stop'
$root='C:\GastroPilot\Export'
$name='Artikelums'+[char]0x00E4+'tze.csv'
$file=Get-ChildItem -LiteralPath $root -Recurse -File -Filter $name | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if(!$file){throw 'Artikeldatei fehlt'}
$path='C:\GastroPilot\Scripts\device-key.dat'
$secure=(Get-Content -LiteralPath $path | Select-Object -First 1).Trim() | ConvertTo-SecureString
$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try{$key=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}
$url='https://sjnwfwcpgwsavygewwzb.supabase.co/functions/v1/bonit-import'
$culture=[Globalization.CultureInfo]::GetCultureInfo('de-AT')
$batch=New-Object 'System.Collections.Generic.List[object]'
$seen=New-Object 'System.Collections.Generic.HashSet[string]'
$total=0
function SendBatch {
 if($batch.Count -eq 0){return}
 $body=@{type='articles';rows=@($batch.ToArray())}|ConvertTo-Json -Depth 5 -Compress
 $response=Invoke-RestMethod -Uri $url -Method Post -Headers @{'x-bonit-device-token'=$key} -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 90
 if(!$response.ok){throw 'Import nicht bestaetigt'}
 $script:total+=$batch.Count
 Write-Host "Artikel uebertragen: $script:total"
 $batch.Clear()
}
$header=$null
$lines=0
$matched=0
$reader=New-Object System.IO.StreamReader($file.FullName,[Text.Encoding]::Default)
Write-Host "START: Lese BONit-Export ($([math]::Round($file.Length/1MB,1)) MB)"
try {
 $header=$reader.ReadLine()
 if(!$header){throw 'CSV ist leer'}
 $columns=$header -split "`t"
 while(($line=$reader.ReadLine()) -ne $null){
  $lines++
  if(($lines % 100000) -eq 0){Write-Host "Gelesen: $lines Zeilen; Oktober-Treffer: $matched; uebertragen: $total"}
  if($line -notmatch '0[1-9]\.10\.2026|10\.10\.2026'){continue}
  $item=$line | ConvertFrom-Csv -Header $columns -Delimiter "`t"
  if($item.TagAbNr -notmatch '^\d+$'){continue}
  $z=[int]$item.TagAbNr
  if($z -lt 1827 -or $z -gt 1835){continue}
  $day=[datetime]::Parse([string]$item.Datum,$culture).ToString('yyyy-MM-dd')
  if($day -lt '2026-10-01' -or $day -gt '2026-10-10'){continue}
  $id=[string]$item.ID
  if([string]::IsNullOrWhiteSpace($id)){throw 'Artikel ohne ID'}
  $source='bonit-article-'+$id
  if(!$seen.Add($source)){continue}
  $quantity=[decimal]::Parse([string]$item.Menge,$culture)
  $batch.Add([pscustomobject]@{source_key=$source;closing_date=$day;z_number=[string]$z;article_number=[string]$item.PLU;article_name=[string]$item.Bezeichnung;quantity=$quantity;gross_amount=$null})
  $matched++
  if($batch.Count -ge 200){SendBatch}
 }
} finally {$reader.Close()}
SendBatch
Write-Host "FERTIG: $total Artikelpositionen aus Oktober 1-10 importiert."
