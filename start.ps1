# GeoMind AI — start backend + frontend in one terminal (Windows)
$root = $PSScriptRoot
Write-Host "Starting GeoMind AI (backend + frontend)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; npm start"
Write-Host ""
Write-Host "Wait ~5 seconds, then open: http://localhost:5173" -ForegroundColor Green
Write-Host "Login: demo@geomind.ai / DemoSurvey2026!" -ForegroundColor Yellow