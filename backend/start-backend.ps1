# Script de inicio del backend Java 17 para Nexo (PUJ)
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Iniciando Nexo Backend en Java 17 + Firebase Admin SDK  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

Set-Location -Path $PSScriptRoot
mvn compile exec:java
