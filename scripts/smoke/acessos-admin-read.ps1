param(
  [Parameter(Mandatory = $true)]
  [string]$BaseUrl,

  [Parameter(Mandatory = $true)]
  [string]$AccessToken,

  [int]$AuditoriaLimit = 100,

  [int]$ExpectedStatus = 200
)

$ErrorActionPreference = 'Stop'

$url = $BaseUrl.TrimEnd('/') + "/functions/v1/acessos-admin-read?auditoria_limit=$AuditoriaLimit"
$headers = @{
  Authorization = "Bearer $AccessToken"
  "Content-Type" = "application/json"
}

Write-Host "GET $url"

try {
  $response = Invoke-WebRequest -Uri $url -Method Get -Headers $headers
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
    'ator_user_id',
    'papel',
    'perfis',
    'vinculos',
    'filiais',
    'auditoria',
    'auditoria_limit'
  )

  foreach ($field in $requiredFields) {
    if (-not $json.data.PSObject.Properties.Name.Contains($field)) {
      throw "Campo ausente em data: $field"
    }
  }

  if ([int]$json.data.auditoria_limit -ne [int]$AuditoriaLimit) {
    throw "Campo data.auditoria_limit divergente. Esperado=$AuditoriaLimit Atual=$($json.data.auditoria_limit)"
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
