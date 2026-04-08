param(
  [Parameter(Mandatory = $true)]
  [string]$BaseUrl,

  [Parameter(Mandatory = $true)]
  [string]$AdminAccessToken,

  [Parameter(Mandatory = $true)]
  [string]$ManagerAccessToken,

  [Parameter(Mandatory = $true)]
  [string]$OperatorAccessToken,

  [Parameter(Mandatory = $true)]
  [string]$CampanhaId,

  [Parameter(Mandatory = $true)]
  [string]$AlvoUserId,

  [Parameter(Mandatory = $true)]
  [string]$AlvoFilialId
)

$ErrorActionPreference = 'Stop'

function Run-Step {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,

    [Parameter(Mandatory = $true)]
    [scriptblock]$Action
  )

  Write-Host ""
  Write-Host "==> $Name" -ForegroundColor Cyan
  & $Action
  Write-Host "OK: $Name" -ForegroundColor Green
}

$campanhasScript = Join-Path $PSScriptRoot 'campanhas-gerar-fila.ps1'
$acessosWriteScript = Join-Path $PSScriptRoot 'acessos-admin.ps1'
$acessosReadScript = Join-Path $PSScriptRoot 'acessos-admin-read.ps1'

Write-Host "Iniciando backend suite da Fase 2" -ForegroundColor Yellow
Write-Host "BaseUrl=$BaseUrl"

Run-Step -Name 'Campanhas - sucesso 200 (dry_run)' -Action {
  & $campanhasScript `
    -BaseUrl $BaseUrl `
    -AccessToken $ManagerAccessToken `
    -CampanhaId $CampanhaId `
    -DryRun `
    -ExpectedStatus 200
}

Run-Step -Name 'Campanhas - autorizacao 403' -Action {
  & $campanhasScript `
    -BaseUrl $BaseUrl `
    -AccessToken $OperatorAccessToken `
    -CampanhaId $CampanhaId `
    -ExpectedStatus 403
}

Run-Step -Name 'Acessos escrita - perfil_upsert 200' -Action {
  & $acessosWriteScript `
    -BaseUrl $BaseUrl `
    -AccessToken $AdminAccessToken `
    -Action 'perfil_upsert' `
    -AlvoUserId $AlvoUserId `
    -Papel 'gerente' `
    -ExpectedStatus 200
}

Run-Step -Name 'Acessos escrita - vinculo_upsert 200' -Action {
  & $acessosWriteScript `
    -BaseUrl $BaseUrl `
    -AccessToken $AdminAccessToken `
    -Action 'vinculo_upsert' `
    -AlvoUserId $AlvoUserId `
    -AlvoFilialId $AlvoFilialId `
    -ExpectedStatus 200
}

Run-Step -Name 'Acessos escrita - autorizacao 403' -Action {
  & $acessosWriteScript `
    -BaseUrl $BaseUrl `
    -AccessToken $OperatorAccessToken `
    -Action 'perfil_delete' `
    -AlvoUserId $AlvoUserId `
    -ExpectedStatus 403
}

Run-Step -Name 'Acessos leitura - sucesso 200' -Action {
  & $acessosReadScript `
    -BaseUrl $BaseUrl `
    -AccessToken $AdminAccessToken `
    -AuditoriaLimit 100 `
    -ExpectedStatus 200
}

Run-Step -Name 'Acessos leitura - autorizacao 403' -Action {
  & $acessosReadScript `
    -BaseUrl $BaseUrl `
    -AccessToken $OperatorAccessToken `
    -ExpectedStatus 403
}

Write-Host ""
Write-Host "Suite backend da Fase 2 concluida com sucesso." -ForegroundColor Green
