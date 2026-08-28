[CmdletBinding()]
param(
  [ValidateSet("start", "stop", "status", "logs", "pull", "test")]
  [string]$Action = "status",
  [string]$Model,
  [switch]$Follow,
  [switch]$KeepProbe
)

function Invoke-Compose([string[]]$Arguments) {
  & docker compose --env-file $environmentFile -f $composeFile @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Docker Compose failed: $($Arguments -join ' ')" }
}

function Show-Endpoint([string]$Name, [string]$Url) {
  try {
    Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 3 | Out-Null
    Write-Host "${Name}: reachable ($Url)" -ForegroundColor Green
  } catch {
    Write-Host "${Name}: unavailable ($Url)" -ForegroundColor Yellow
  }
}

function Get-EnvironmentValues([string]$Path) {
  $values = @{}
  foreach ($line in Get-Content $Path) {
    if ($line -match '^\s*([^#=\s]+)\s*=\s*(.*)\s*$') { $values[$matches[1]] = $matches[2] }
  }
  return $values
}

function Get-EnvironmentPort($Values, [string]$Name, [int]$Default) {
  if ($Values.ContainsKey($Name) -and $Values[$Name] -match '^\d+$') { return [int]$Values[$Name] }
  return $Default
}

function Get-DataDirectory($Values, [string]$Name, [string]$Default) {
  $path = if ($Values.ContainsKey($Name) -and -not [string]::IsNullOrWhiteSpace($Values[$Name])) { $Values[$Name] } else { $Default }
  if (-not (Test-Path $path)) { New-Item -ItemType Directory -Force -Path $path | Out-Null }
  return (Resolve-Path $path).Path
}

function Test-LocalAi([int]$OllamaPort, [int]$QdrantPort, [string]$Model, [switch]$KeepProbe) {
  if ([string]::IsNullOrWhiteSpace($Model)) { throw "Set LOCAL_AI_CHAT_MODEL or pass -Model before running the test." }

  $ollamaUrl = "http://127.0.0.1:$OllamaPort"
  $qdrantUrl = "http://127.0.0.1:$QdrantPort"
  Invoke-WebRequest -UseBasicParsing -Uri "$qdrantUrl/healthz" -TimeoutSec 10 | Out-Null
  $probeCollection = "neot_setup_probe"
  $definition = @{ vectors = @{ size = 8; distance = "Cosine" } } | ConvertTo-Json -Depth 3
  Invoke-RestMethod -Method Put -Uri "$qdrantUrl/collections/$probeCollection" -ContentType "application/json" -TimeoutSec 10 -Body $definition | Out-Null
  if (-not $KeepProbe) {
    Invoke-RestMethod -Method Delete -Uri "$qdrantUrl/collections/$probeCollection" -TimeoutSec 10 | Out-Null
  }
  Write-Host "Qdrant health and collection API succeeded$(if ($KeepProbe) { '; retained neot_setup_probe.' } else { '; temporary probe removed.' })" -ForegroundColor Green

  $models = Invoke-RestMethod -Method Get -Uri "$ollamaUrl/api/tags" -TimeoutSec 10
  $availableModels = @($models.models | ForEach-Object { $_.name })
  if ($availableModels -notcontains $Model) {
    throw "Ollama is reachable but '$Model' is not installed. Run npm.cmd run local-ai:setup -- -Apply -PullModels or use the pull action."
  }

  $reply = Invoke-RestMethod -Method Post -Uri "$ollamaUrl/api/generate" -ContentType "application/json" -TimeoutSec 90 -Body (@{
      model = $Model
      prompt = "Reply with exactly: NEOT local AI ready"
      stream = $false
    } | ConvertTo-Json)
  if ([string]::IsNullOrWhiteSpace($reply.response)) { throw "Ollama returned an empty response." }
  Write-Host "Ollama generation succeeded with $Model." -ForegroundColor Green
  Write-Host "Local AI end-to-end test passed." -ForegroundColor Green
}

$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $PSCommandPath
$repositoryRoot = Resolve-Path (Join-Path $scriptRoot "..\..")
$composeFile = Join-Path $scriptRoot "docker-compose.yml"
$environmentFile = Join-Path $scriptRoot ".env"
$storageRoot = Join-Path $repositoryRoot "storage\local-ai"

if (-not (Test-Path $environmentFile)) {
  throw "Missing .container/local-ai/.env. Preview the setup with npm run local-ai:setup, then run it with -Apply."
}

$environment = Get-EnvironmentValues $environmentFile
$ollamaData = Get-DataDirectory $environment "LOCAL_AI_OLLAMA_DATA_DIR" (Join-Path $storageRoot "ollama")
$qdrantData = Get-DataDirectory $environment "LOCAL_AI_QDRANT_DATA_DIR" (Join-Path $storageRoot "qdrant")
$env:LOCAL_AI_OLLAMA_DATA_DIR = $ollamaData
$env:LOCAL_AI_QDRANT_DATA_DIR = $qdrantData
$ollamaPort = Get-EnvironmentPort $environment "LOCAL_AI_OLLAMA_PORT" 11434
$qdrantPort = Get-EnvironmentPort $environment "LOCAL_AI_QDRANT_HTTP_PORT" 6333

switch ($Action) {
  "start" {
    Invoke-Compose @("up", "-d", "ollama", "qdrant")
    Write-Host "Local AI services started. Run npm run local-ai:test when models are available." -ForegroundColor Green
  }
  "stop" {
    Invoke-Compose @("stop", "ollama", "qdrant")
    Write-Host "Local AI services stopped. Persistent model and vector data was kept."
  }
  "status" {
    Invoke-Compose @("ps")
    Show-Endpoint "Ollama" "http://127.0.0.1:$ollamaPort/api/tags"
    Show-Endpoint "Qdrant" "http://127.0.0.1:$qdrantPort/healthz"
  }
  "logs" {
    $arguments = @("logs", "--tail", "100")
    if ($Follow) { $arguments += "--follow" }
    $arguments += @("ollama", "qdrant")
    Invoke-Compose $arguments
  }
  "pull" {
    $modelToPull = if ($Model) { $Model } else { $environment["LOCAL_AI_CHAT_MODEL"] }
    if ([string]::IsNullOrWhiteSpace($modelToPull)) { throw "Provide -Model or set LOCAL_AI_CHAT_MODEL in .container/local-ai/.env." }
    Invoke-Compose @("exec", "-T", "ollama", "ollama", "pull", $modelToPull)
  }
  "test" {
    $modelToTest = if ($Model) { $Model } else { $environment["LOCAL_AI_CHAT_MODEL"] }
    Test-LocalAi -OllamaPort $ollamaPort -QdrantPort $qdrantPort -Model $modelToTest -KeepProbe:$KeepProbe
  }
}
