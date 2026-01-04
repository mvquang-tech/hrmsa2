# PowerShell helper to call reminders endpoint
# Usage: $env:CRON_SECRET='..'; $env:REMINDERS_URL='https://example.com/api/meetings/send-reminders'; .\scripts\run-send-reminders.ps1

$RemindersUrl = $env:REMINDERS_URL -or 'http://localhost:3000/api/meetings/send-reminders'
$CronSecret = $env:CRON_SECRET

if (-not $CronSecret) {
  Write-Error 'Set $env:CRON_SECRET before running'
  exit 1
}

Write-Host "Calling $RemindersUrl"
try {
  $resp = Invoke-RestMethod -Uri $RemindersUrl -Method GET -Headers @{ 'x-cron-secret' = $CronSecret }
  $resp | ConvertTo-Json -Depth 5
} catch {
  Write-Error "Request failed: $_"
  exit 1
}
