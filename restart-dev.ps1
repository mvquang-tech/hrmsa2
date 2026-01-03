# Script to restart dev server with clean cache
Write-Host "Clearing Next.js cache..."
if (Test-Path .next) {
    Remove-Item -Recurse -Force .next
    Write-Host "✓ .next cache cleared"
}

Write-Host "Starting dev server..."
npm run dev

