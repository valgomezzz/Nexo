# Inicia el backend de Nexo en http://localhost:8080
$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$env:GOOGLE_APPLICATION_CREDENTIALS = "$PSScriptRoot\serviceAccountKey.json"
Write-Host "Iniciando backend de Nexo en http://localhost:8080 ..." -ForegroundColor Cyan
mvn function:run
