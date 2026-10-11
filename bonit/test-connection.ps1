# GastroPilot BONit: authentication-only connectivity test. No sales data uploaded.
$ErrorActionPreference = 'Stop'
$keyPath = 'C:\GastroPilot\Scripts\device-key.dat'
if (-not (Test-Path -LiteralPath $keyPath)) { throw 'Geraeteschluessel nicht gefunden.' }
$secure = (Get-Content -LiteralPath $keyPath | Select-Object -First 1).Trim() | ConvertTo-SecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
$url = 'https://sjnwfwcpgwsavygewwzb.supabase.co/functions/v1/bonit-import'
try {
  $result = Invoke-RestMethod -Method Post -Uri $url -Headers @{ 'x-bonit-device-token' = $token } -ContentType 'application/json' -Body '{"type":"closings","rows":[]}' -TimeoutSec 30
  Write-Host 'Antwort:' ($result | ConvertTo-Json -Compress)
} catch {
  $resp = $_.Exception.Response
  if ($null -ne $resp) {
    $status = [int]$resp.StatusCode
    if ($status -eq 400) { Write-Host 'VERBINDUNG ERFOLGREICH: Geraet erkannt. Testdaten absichtlich abgelehnt (HTTP 400).'; exit 0 }
    Write-Host "Verbindung nicht erfolgreich. HTTP $status"
    exit 1
  }
  Write-Host "Netzwerkfehler: $($_.Exception.Message)"
  exit 1
} finally { $token = $null }
