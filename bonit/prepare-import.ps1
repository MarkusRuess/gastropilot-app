# GastroPilot BONit FlexX - local validation, no upload and no POS modification
$ErrorActionPreference = 'Stop'
$root = 'C:\GastroPilot\Export'
$out = 'C:\GastroPilot\Prepared'
New-Item -ItemType Directory -Force -Path $out | Out-Null
function LatestCsv([string]$name) {
  $f = Get-ChildItem -LiteralPath $root -Recurse -File -Filter $name | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $f) { throw "Datei nicht gefunden: $name" }
  return $f
}
function NumberValue($v) {
  if ([string]::IsNullOrWhiteSpace([string]$v)) { return $null }
  $n = 0.0
  if (-not [double]::TryParse([string]$v,[System.Globalization.NumberStyles]::Any,[System.Globalization.CultureInfo]::GetCultureInfo('de-AT'),[ref]$n)) { throw "Ungueltige Zahl: $v" }
  return [math]::Round($n, 2)
}
function DayValue($v) {
  $d = [datetime]::MinValue
  if (-not [datetime]::TryParse([string]$v,[System.Globalization.CultureInfo]::GetCultureInfo('de-AT'),[System.Globalization.DateTimeStyles]::None,[ref]$d)) { throw "Ungueltiges Datum: $v" }
  return $d.ToString('yyyy-MM-dd')
}
$closingFile=LatestCsv ('Tagesabschl' + [char]0x00FC + 'sse.csv')
$articleFile=LatestCsv ('Artikelums' + [char]0x00E4 + 'tze.csv')
Write-Host "Abschluesse: $($closingFile.FullName)"
Write-Host "Artikel: $($articleFile.FullName)"
$closings = @(Import-Csv -LiteralPath $closingFile.FullName -Delimiter "`t" | Where-Object { $_.ID -and $_.DatumDurchfuehrung } | ForEach-Object {
  $gross=NumberValue $_.Summe
  $cash=NumberValue $_.Summebar
  $card=NumberValue $_.SummeUnbar
  [pscustomobject]@{
    z_number=[string]$_.ID
    closing_date=(DayValue $_.DatumDurchfuehrung)
    gross_amount=$gross
    net_amount=$null
    cash_amount=$cash
    card_amount=$card
    receipt_count=[int]$_.AnzahlRechnungen
  }
})
$last = @($closings | Sort-Object closing_date,z_number | Select-Object -Last 10)
$last | Format-Table -AutoSize
$last | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $out 'bonit_closings_preview.json') -Encoding UTF8
Write-Host "Abschluesse insgesamt: $($closings.Count)"
Write-Host "Artikeldatei vorhanden: $([math]::Round($articleFile.Length/1MB,1)) MB"
Write-Host "Vorschau gespeichert: $out\bonit_closings_preview.json"
Write-Host 'KEIN Upload. KEINE Aenderung an BONit.'
