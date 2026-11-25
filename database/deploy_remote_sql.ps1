# =====================================================================
# Script PowerShell de déploiement automatique de la base SystemTracabilie
# Cible : 192.168.1.253 (SQL Server Express / Standard)
# =====================================================================

param(
    [string]$Server = "192.168.1.253,1433",
    [string]$User = "sa",
    [string]$Password = "0000",
    [string]$Database = "SystemTracabilie"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Sensus - Déploiement Base SQL Server : $Database" -ForegroundColor Cyan
Write-Host " Cible : $Server" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$schemaFile = Join-Path $PSScriptRoot "schema.sql"
if (-not (Test-Path $schemaFile)) {
    Write-Host "Erreur: Fichier schema.sql introuvable dans $PSScriptRoot" -ForegroundColor Red
    exit 1
}

Write-Host "[1/2] Exécution du schéma SQL sur $Server..." -ForegroundColor Yellow
$output = sqlcmd -S $Server -U $User -P $Password -i $schemaFile 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Schéma déployé avec succès !" -ForegroundColor Green
    Write-Host $output -ForegroundColor Gray
} else {
    Write-Host "❌ Erreur lors du déploiement du schéma:" -ForegroundColor Red
    Write-Host $output -ForegroundColor Red
    exit 1
}

Write-Host "[2/2] Vérification des tables créées..." -ForegroundColor Yellow
sqlcmd -S $Server -U $User -P $Password -d $Database -Q "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE';"
Write-Host "✅ Déploiement terminé avec succès !" -ForegroundColor Green

