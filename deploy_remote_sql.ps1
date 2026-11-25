# ==============================================================================
# PowerShell script to deploy SystemTracabilie database to remote server 192.168.1.253
# Usage:
#   .\deploy_remote_sql.ps1 -User "sa" -Password "YourPassword"
#   or run without params to be prompted securely for password.
# ==============================================================================
param (
    [string]$Server = "192.168.1.253",
    [string]$User = "sa",
    [string]$Password = ""
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Sensus - Deploiement Base SystemTracabilie -> $Server" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$scriptPath = Join-Path $PSScriptRoot "SystemTracabilie_schema.sql"
if (-not (Test-Path $scriptPath)) {
    Write-Error "Script introuvable: $scriptPath"
    exit 1
}

if ([string]::IsNullOrWhiteSpace($Password)) {
    $Password = Read-Host "Entrez le mot de passe SQL pour l'utilisateur [$User]" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password)
    $Password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

Write-Host "Connexion au serveur SQL $Server..." -ForegroundColor Yellow
$out = sqlcmd -S $Server -U $User -P $Password -i $scriptPath -b
if ($LASTEXITCODE -eq 0) {
    Write-Host "`nBase de donnees SystemTracabilie deployee avec succes sur $Server!" -ForegroundColor Green
} else {
    Write-Host "`nEchec du deploiement. Verifiez les identifiants ou l'acces reseau." -ForegroundColor Red
}

