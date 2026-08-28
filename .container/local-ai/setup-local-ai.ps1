[CmdletBinding()]
param(
  [switch]$Apply,
  [switch]$PullModels,
  [string]$ChatModel,
  [string]$EmbeddingModel
)

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name is required. Install Docker Desktop, start it, then rerun this script."
  }
}

function Invoke-Compose([string[]]$Arguments) {
  & docker compose --env-file $environmentFile -f $composeFile @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Docker Compose failed: $($Arguments -join ' ')" }
}

function Wait-ForHttp([string]$Url, [string]$Name) {
  $deadline = (Get-Date).AddSeconds(60)
  do {
    try {
      Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 3 | Out-Null
      Write-Host "$Name is reachable at $Url" -ForegroundColor Green
      return
    } catch {
      Start-Sleep -Seconds 2
    }
  } while ((Get-Date) -lt $deadline)

  throw "$Name did not become reachable at $Url within 60 seconds. Inspect with npm run local-ai:status."
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

$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $PSCommandPath
$repositoryRoot = Resolve-Path (Join-Path $scriptRoot "..\..")
$composeFile = Join-Path $scriptRoot "docker-compose.yml"
$environmentFile = Join-Path $scriptRoot ".env"
$environmentExample = Join-Path $scriptRoot "local-ai.env.example"
$storageRoot = Join-Path $repositoryRoot "storage\local-ai"

Write-Host "NEOT local AI setup" -ForegroundColor Cyan
Write-Host "Mode: $(if ($Apply) { 'apply' } else { 'preview only' })"
Write-Host "Services: Ollama on 127.0.0.1:11434, Qdrant on 127.0.0.1:6333"
Write-Host "Default models: chat=qwen2.5-coder:3b, embeddings=nomic-embed-text"

if (-not $Apply) {
  Write-Host ""
  Write-Host "No files, containers, or models were changed." -ForegroundColor Yellow
  Write-Host "Review this plan, then run:"
  Write-Host "  powershell -NoProfile -ExecutionPolicy Bypass -File .container/local-ai/setup-local-ai.ps1 -Apply"
  Write-Host "Add -PullModels only when you are ready to download the selected models."
  exit 0
}

Require-Command "docker"
& docker version --format '{{.Server.Version}}' | Out-Null
& docker compose version | Out-Null

if (-not (Test-Path $environmentFile)) {
  Copy-Item $environmentExample $environmentFile
  Write-Host "Created .container/local-ai/.env from the tracked example."
}

$environment = Get-EnvironmentValues $environmentFile
if ($ChatModel) { $environment["LOCAL_AI_CHAT_MODEL"] = $ChatModel }
if ($EmbeddingModel) { $environment["LOCAL_AI_EMBEDDING_MODEL"] = $EmbeddingModel }

$ollamaData = $environment["LOCAL_AI_OLLAMA_DATA_DIR"]
if ([string]::IsNullOrWhiteSpace($ollamaData)) { $ollamaData = Join-Path $storageRoot "ollama" }

$qdrantData = $environment["LOCAL_AI_QDRANT_DATA_DIR"]
if ([string]::IsNullOrWhiteSpace($qdrantData)) { $qdrantData = Join-Path $storageRoot "qdrant" }

New-Item -ItemType Directory -Force -Path $ollamaData, $qdrantData | Out-Null
$env:LOCAL_AI_OLLAMA_DATA_DIR = (Resolve-Path $ollamaData).Path
$env:LOCAL_AI_QDRANT_DATA_DIR = (Resolve-Path $qdrantData).Path

Invoke-Compose @("up", "-d", "ollama", "qdrant")

$ollamaPort = Get-EnvironmentPort $environment "LOCAL_AI_OLLAMA_PORT" 11434
$qdrantPort = Get-EnvironmentPort $environment "LOCAL_AI_QDRANT_HTTP_PORT" 6333
Wait-ForHttp "http://127.0.0.1:$ollamaPort/api/tags" "Ollama"
Wait-ForHttp "http://127.0.0.1:$qdrantPort/healthz" "Qdrant"

if ($PullModels) {
  $chatModelName = $environment["LOCAL_AI_CHAT_MODEL"]
  $embeddingModelName = $environment["LOCAL_AI_EMBEDDING_MODEL"]
  Write-Host "Pulling chat model: $chatModelName"
  Invoke-Compose @("exec", "-T", "ollama", "ollama", "pull", $chatModelName)
  Write-Host "Pulling embedding model: $embeddingModelName"
  Invoke-Compose @("exec", "-T", "ollama", "ollama", "pull", $embeddingModelName)
} else {
  Write-Host "Services are ready. Models were not downloaded. Run with -PullModels when ready." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next: npm.cmd run local-ai:test" -ForegroundColor Green
Write-Host "Then configure Desktop Settings > Ollama with http://127.0.0.1:$ollamaPort and a pulled model."
