param(
  [Parameter(Mandatory = $true)]
  [string]$BaseUrl,

  [Parameter(Mandatory = $true)]
  [string]$AccessToken,

  [Parameter(Mandatory = $true)]
  [string]$CampanhaId,

  [switch]$DryRun,

  [int]$ExpectedStatus = 200
)

$ErrorActionPreference = 'Stop'

$url = $BaseUrl.TrimEnd('/') + '/functions/v1/campanhas-gerar-fila'
$payload = @{
  campanha_id = $CampanhaId
  dry_run = [bool]$DryRun
} | ConvertTo-Json -Depth 5

$headers = @{
  Authorization = "Bearer $AccessToken"
  "Content-Type" = "application/json"
}

Write-Host "POST $url"
Write-Host "campanha_id=$CampanhaId dry_run=$([bool]$DryRun)"

try {
  $response = Invoke-WebRequest -Uri $url -Method Post -Headers $headers -Body $payload
  $statusCode = [int]$response.StatusCode
  $bodyText = $response.Content
} catch {
  $webResponse = $_.Exception.Response
  if (-not $webResponse) { throw }
  $statusCode = [int]$webResponse.StatusCode
  $reader = New-Object System.IO.StreamReader($webResponse.GetResponseStream())
  $bodyText = $reader.ReadToEnd()
}

Write-Host "status=$statusCode"
Write-Host $bodyText

if ($statusCode -ne $ExpectedStatus) {
  throw "Status inesperado. Esperado=$ExpectedStatus Atual=$statusCode"
}

$json = $bodyText | ConvertFrom-Json

if ($ExpectedStatus -eq 200) {
  if (-not $json.ok) {
    throw "Resposta 200 sem ok=true"
  }

  if (-not $json.data) {
    throw "Resposta 200 sem data"
  }

  $requiredFields = @(
    'campanha_id',
    'filial_id',
    'dry_run',
    'criados',
    'ignorados',
    'falhas',
    'total_elegiveis'
  )

  foreach ($field in $requiredFields) {
    if (-not $json.data.PSObject.Properties.Name.Contains($field)) {
      throw "Campo ausente em data: $field"
    }
  }

  Write-Host "Smoke OK: contrato de sucesso validado."
  exit 0
}

if (-not $json.error) {
  throw "Resposta de erro sem objeto error"
}

if (-not $json.error.code) {
  throw "Resposta de erro sem error.code"
}

if (-not $json.error.message) {
  throw "Resposta de erro sem error.message"
}

Write-Host "Smoke OK: contrato de erro validado."
