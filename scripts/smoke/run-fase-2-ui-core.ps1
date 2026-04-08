param(
  [string]$BaseUrl = $env:E2E_BASE_URL,
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

function Invoke-Step {
  param(
    [string]$Name,
    [string]$SpecPath
  )

  Write-Host ""
  Write-Host "==> Executando: $Name" -ForegroundColor Cyan
  & npx.cmd playwright test $SpecPath
  if ($LASTEXITCODE -ne 0) {
    throw "Falha no step: $Name"
  }
}

Assert-RequiredEnv -Name 'E2E_BASE_URL' -Value $BaseUrl
Assert-RequiredEnv -Name 'E2E_LOGIN_EMAIL' -Value $LoginEmail
Assert-RequiredEnv -Name 'E2E_LOGIN_PASSWORD' -Value $LoginPassword
Assert-RequiredEnv -Name 'E2E_SUPABASE_URL' -Value $SupabaseUrl
Assert-RequiredEnv -Name 'E2E_SUPABASE_KEY' -Value $SupabaseKey

$env:E2E_BASE_URL = $BaseUrl
$env:E2E_LOGIN_EMAIL = $LoginEmail
$env:E2E_LOGIN_PASSWORD = $LoginPassword
$env:E2E_SUPABASE_URL = $SupabaseUrl
$env:E2E_SUPABASE_KEY = $SupabaseKey

Write-Host "Iniciando runner da Onda B / UI Core" -ForegroundColor Green
Write-Host "Base URL: $BaseUrl"
Write-Host "Login: $LoginEmail"

Invoke-Step -Name 'login' -SpecPath 'tests/e2e/login.spec.js'
Invoke-Step -Name 'setup-filial' -SpecPath 'tests/e2e/setup-filial.spec.js'
Invoke-Step -Name 'bootstrap-filial' -SpecPath 'tests/e2e/bootstrap-filial.spec.js'

Write-Host ""
Write-Host "Runner da Onda B concluido com sucesso." -ForegroundColor Green
