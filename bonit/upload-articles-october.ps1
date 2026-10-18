# GastroPilot BONit: Artikelumsätze aus dem aktuellen vollständigen Export importieren
# Alle Datenzeilen werden verarbeitet; kein festes Monats- oder Z-Beleg-Datum.
$ErrorActionPreference='Stop'
$root='C:\GastroPilot\Export'
$name='Artikelums'+[char]0x00E4+'tze.csv'
$file=Get-ChildItem -LiteralPath $root -Recurse -File -Filter $name | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if(!$file){throw 'Artikeldatei fehlt'}
$keyPath='C:\GastroPilot\Scripts\device-key.dat'
$secure=(Get-Content -LiteralPath $keyPath | Select-Object -First 1).Trim() | ConvertTo-SecureString
$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try{$key=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}
$url='https://sjnwfwcpgwsavygewwzb.supabase.co/functions/v1/bonit-import'
$culture=[Globalization.CultureInfo]::GetCultureInfo('de-AT')
$batch=New-Object 'System.Collections.Generic.List[object]'
$seen=New-Object 'System.Collections.Generic.HashSet[string]'
$total=0
function Find-Column([string[]]$headers,[string[]]$aliases){
 foreach($alias in $aliases){foreach($header in $headers){if($header -ieq $alias){return $header}}}
 return $null
}
function Get-Field($row,[string]$column){
 if(!$column){return $null}
 $property=$row.PSObject.Properties[$column]
 if($property){return $property.Value}
 return $null
}
function Parse-Number([string]$value,[string]$label){
 if([string]::IsNullOrWhiteSpace($value)){return $null}
 $parsed=[decimal]0
 if(-not [decimal]::TryParse($value,[Globalization.NumberStyles]::Any,$culture,[ref]$parsed)){throw "Ungültige Zahl in '$label': $value"}
 return $parsed
}
function Send-Batch {
 if($batch.Count -eq 0){return}
 $body=@{type='articles';rows=@($batch.ToArray())}|ConvertTo-Json -Depth 6 -Compress
 $response=Invoke-RestMethod -Uri $url -Method Post -Headers @{'x-bonit-device-token'=$key} -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 90
 if($response.ok -ne $true){throw ('Import nicht bestätigt: '+($response|ConvertTo-Json -Compress))}
 $script:total += [int]$response.accepted
 Write-Host "Vom Server gespeichert/aktualisiert: $script:total"
 $batch.Clear()
}
$reader=New-Object System.IO.StreamReader($file.FullName,[Text.Encoding]::Default)
$lines=0
$matched=0
try {
 $headerLine=$reader.ReadLine()
 if(!$headerLine){throw 'Artikeldatei ist leer'}
 $headers=@(($headerLine -split "`t") | ForEach-Object {$_.Trim().TrimStart([char]0xFEFF)})
 $dateCol=Find-Column $headers @('Datum','DatumDurchfuehrung','Buchungsdatum')
 $zCol=Find-Column $headers @('TagAbNr','ZAbNr','ZNummer','Abschlussnummer')
 $idCol=Find-Column $headers @('ID','ArtikelID','PositionsID')
 $qtyCol=Find-Column $headers @('Menge','Anzahl','Stueck','Stück')
 $pluCol=Find-Column $headers @('PLU','ArtikelNr','Artikelnummer','PLUNr')
 $nameCol=Find-Column $headers @('Bezeichnung','Artikelname','Name')
 $grossCol=Find-Column $headers @('Bruttobetrag','Gesamtbrutto','UmsatzBrutto','Brutto','SummeBrutto','BetragBrutto','Gesamtbetrag','Summe','Umsatz','Betrag')
 $unitCol=Find-Column $headers @('EinzelpreisBrutto','VerkaufspreisBrutto','PreisBrutto','Einzelpreis','Verkaufspreis','Preis','UnitPrice')
 $missing=@()
 if(!$dateCol){$missing+='Datum'}
 if(!$zCol){$missing+='Z-Beleg'}
 if(!$idCol){$missing+='Positions-ID'}
 if(!$qtyCol){$missing+='Menge'}
 if(!$nameCol){$missing+='Artikelname'}
 if($missing.Count){throw "BONit-Spalten fehlen: $($missing -join ', '). Gefundene Spalten: $($headers -join ' | ')"}
 if(!$grossCol -and !$unitCol){throw "Keine Umsatz- oder Bruttopreisspalte gefunden. Gefundene Spalten: $($headers -join ' | ')"}
 Write-Host "Datei: $($file.FullName)"
 Write-Host "Lese alle Datenzeilen; Datum '$dateCol', Umsatz '$grossCol', Preisfallback '$unitCol'."
 while(($line=$reader.ReadLine()) -ne $null){
  $lines++
  if([string]::IsNullOrWhiteSpace($line)){continue}
  if(($lines % 100000) -eq 0){Write-Host "Gelesen: $lines Zeilen; importbereit: $matched; gespeichert/aktualisiert: $total"}
  $item=$line | ConvertFrom-Csv -Header $headers -Delimiter "`t"
  $id=[string](Get-Field $item $idCol)
  if([string]::IsNullOrWhiteSpace($id)){continue}
  $dateText=[string](Get-Field $item $dateCol)
  $parsedDate=[datetime]::MinValue
  if(-not [datetime]::TryParse($dateText,$culture,[Globalization.DateTimeStyles]::AllowWhiteSpaces,[ref]$parsedDate)){throw "Ungültiges Datum in Zeile $lines: $dateText"}
  $day=$parsedDate.ToString('yyyy-MM-dd')
  $z=[string](Get-Field $item $zCol)
  if($z -notmatch '^\d{1,15}$'){throw "Ungültige Z-Abschlussnummer in Zeile $lines: $z"}
  $quantity=Parse-Number ([string](Get-Field $item $qtyCol)) $qtyCol
  if($null -eq $quantity -or $quantity -eq 0){continue}
  $unitPrice=$null
  if($unitCol){$unitPrice=Parse-Number ([string](Get-Field $item $unitCol)) $unitCol}
  $gross=$null
  if($grossCol){$gross=Parse-Number ([string](Get-Field $item $grossCol)) $grossCol}
  if($null -eq $gross -and $null -ne $unitPrice){$gross=[math]::Round($quantity*$unitPrice,2)}
  if($null -eq $gross){throw "Bruttoumsatz fehlt in Zeile $lines (ID $id); Import an dieser Stelle gestoppt."}
  $source='bonit-article-'+$id
  if(!$seen.Add($source)){continue}
  $batch.Add([pscustomobject]@{
   source_key=$source;closing_date=$day;z_number=$z
   article_number=[string](Get-Field $item $pluCol);article_name=[string](Get-Field $item $nameCol)
   quantity=$quantity;gross_amount=$gross;unit_price=$unitPrice
  })
  $matched++
  if($batch.Count -ge 200){Send-Batch}
 }
} finally {$reader.Close()}
Send-Batch
Write-Host "FERTIG: $total Artikelpositionen gespeichert oder aktualisiert; geprüfte Zeilen: $lines."
