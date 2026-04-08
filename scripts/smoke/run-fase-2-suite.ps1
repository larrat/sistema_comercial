param(
  [string]$BaseUrl = $env:E2E_BASE_URL,
  [string]$AdminAccessToken = $env:E2E_ADMIN_ACCESS_TOKEN,
  [string]$ManagerAccessToken = $env:E2E_MANAGER_ACCESS_TOKEN,
  [string]$OperatorAccessToken = $env:E2E_OPERATOR_ACCESS_TOKEN,
  [string]$CampanhaId = $env:E2E_CAMPANHA_ID,
  [string]$AlvoUserId = $env:E2E_ALVO_USER_ID,
  [string]$AlvoFilialId = $env:E2E_ALVO_FILIAL_ID,
  [string]$LoginEmail = $env:E2E_LOGIN_EMAIL,
  [string]$LoginPassword = $env:E2E_LOGIN_PASSWORD,
  [string]$SupabaseUrl = $env:E2E_SUPABASE_URL,
  [string]$SupabaseKey = $env:E2E_SUPABASE_KEY
)

$ErrorActionPreference = 'Stop'

function Assert-RequiredEnv {
  param(
    [string]$Name,
    [string]$Value
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "Variavel obrigatoria ausente: $Name"
  }
}

function Invoke-Runner {
  param(
    [string]$Name,
    [scriptblock]$Action
  )

  Write-Host ""
  Write-Host "==> Executando runner: $Name" -ForegroundColor Cyan
  & $Action
  if ($LASTEXITCODE -ne 0) {
    throw "Falha no runner: $Name"
  }
  Write-Host "OK: $Name" -ForegroundColor Green
}

$backendRunner = Join-Path $PSScriptRoot 'run-fase-2-backend-suite.ps1'
$uiRunner = Join-Path $PSScriptRoot 'run-fase-2-ui-core.ps1'

Assert-RequiredEnv -Name 'E2E_BASE_URL' -Value $BaseUrl
Assert-RequiredEnv -Name 'E2E_ADMIN_ACCESS_TOKEN' -Value $AdminAccessToken
Assert-RequiredEnv -Name 'E2E_MANAGER_ACCESS_TOKEN' -Value $ManagerAccessToken
Assert-RequiredEnv -Name 'E2E_OPERATOR_ACCESS_TOKEN' -Value $OperatorAccessToken
Assert-RequiredEnv -Name 'E2E_CAMPANHA_ID' -Value $CampanhaId
Assert-RequiredEnv -Name 'E2E_ALVO_USER_ID' -Value $AlvoUserId
Assert-RequiredEnv -Name 'E2E_ALVO_FILIAL_ID' -Value $AlvoFilialId
Assert-RequiredEnv -Name 'E2E_LOGIN_EMAIL' -Value $LoginEmail
Assert-RequiredEnv -Name 'E2E_LOGIN_PASSWORD' -Value $LoginPassword
Assert-RequiredEnv -Name 'E2E_SUPABASE_URL' -Value $SupabaseUrl
Assert-RequiredEnv -Name 'E2E_SUPABASE_KEY' -Value $SupabaseKey

Write-Host "Iniciando suite completa da Fase 2" -ForegroundColor Yellow
Write-Host "Base URL: $BaseUrl"

Invoke-Runner -Name 'Backend Suite / Onda A' -Action {
  & $backendRunner `
    -BaseUrl $BaseUrl `
    -AdminAccessToken $AdminAccessToken `
    -ManagerAccessToken $ManagerAccessToken `
    -OperatorAccessToken $OperatorAccessToken `
    -CampanhaId $CampanhaId `
    -AlvoUserId $AlvoUserId `
    -AlvoFilialId $AlvoFilialId
}

Invoke-Runner -Name 'UI Core / Onda B' -Action {
  & $uiRunner `
    -BaseUrl $BaseUrl `
    -LoginEmail $LoginEmail `
    -LoginPassword $LoginPassword `
    -SupabaseUrl $SupabaseUrl `
    -SupabaseKey $SupabaseKey
}

Write-Host ""
Write-Host "Suite completa da Fase 2 concluida com sucesso." -ForegroundColor Green
