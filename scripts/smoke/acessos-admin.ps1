param(
  [Parameter(Mandatory = $true)]
  [string]$BaseUrl,

  [Parameter(Mandatory = $true)]
  [string]$AccessToken,

  [Parameter(Mandatory = $true)]
  [ValidateSet('perfil_upsert', 'perfil_delete', 'vinculo_upsert', 'vinculo_delete')]
  [string]$Action,

  [Parameter(Mandatory = $true)]
  [string]$AlvoUserId,

  [string]$AlvoFilialId,

  [ValidateSet('admin', 'gerente', 'operador')]
  [string]$Papel,

  [int]$ExpectedStatus = 200
)

$ErrorActionPreference = 'Stop'

$url = $BaseUrl.TrimEnd('/') + '/functions/v1/acessos-admin'
$payloadObject = @{
  action = $Action
  alvo_user_id = $AlvoUserId
}

if ($PSBoundParameters.ContainsKey('AlvoFilialId')) {
  $payloadObject.alvo_filial_id = $AlvoFilialId
}

if ($PSBoundParameters.ContainsKey('Papel')) {
  $payloadObject.papel = $Papel
}

$payload = $payloadObject | ConvertTo-Json -Depth 5

$headers = @{
  Authorization = "Bearer $AccessToken"
  "Content-Type" = "application/json"
}

Write-Host "POST $url"
Write-Host "action=$Action alvo_user_id=$AlvoUserId alvo_filial_id=$AlvoFilialId papel=$Papel"

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
    'action',
    'ator_user_id',
    'alvo_user_id',
    'alvo_filial_id',
    'recurso',
    'result'
  )

  foreach ($field in $requiredFields) {
    if (-not $json.data.PSObject.Properties.Name.Contains($field)) {
      throw "Campo ausente em data: $field"
    }
  }

  if ($json.data.action -ne $Action) {
    throw "Campo data.action divergente. Esperado=$Action Atual=$($json.data.action)"
  }

  if ($json.data.alvo_user_id -ne $AlvoUserId) {
    throw "Campo data.alvo_user_id divergente. Esperado=$AlvoUserId Atual=$($json.data.alvo_user_id)"
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
