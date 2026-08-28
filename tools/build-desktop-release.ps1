$ErrorActionPreference = "Stop"

& npm.cmd run dependencies:check
if ($LASTEXITCODE -ne 0) {
  throw "The repository artifact layout check failed with exit code $LASTEXITCODE."
}

$keyPath = Join-Path $env:USERPROFILE ".tauri\neot-desktop-v2.key"
$passwordPath = Join-Path $env:USERPROFILE ".tauri\neot-desktop-v2-key-password.clixml"

if (-not (Test-Path -LiteralPath $keyPath)) {
  $keyPath = Join-Path $env:USERPROFILE ".tauri\neot-desktop-v2.key"
}
if (-not (Test-Path -LiteralPath $passwordPath)) {
  $passwordPath = Join-Path $env:USERPROFILE ".tauri\neot-desktop-v2-key-password.clixml"
}

if (-not (Test-Path -LiteralPath $keyPath)) {
  throw "The desktop updater private key is missing: $keyPath"
}

if (-not (Test-Path -LiteralPath $passwordPath)) {
  throw "The desktop updater key password is missing: $passwordPath"
}

$securePassword = Import-Clixml -LiteralPath $passwordPath
$credential = [PSCredential]::new("desktop-release", $securePassword)

try {
  $env:TAURI_SIGNING_PRIVATE_KEY = $keyPath
  $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = $credential.GetNetworkCredential().Password
  & npm.cmd run desktop:build
  if ($LASTEXITCODE -ne 0) {
    throw "The signed desktop build failed with exit code $LASTEXITCODE."
  }
  & node tools/publish-desktop-release.mjs
  if ($LASTEXITCODE -ne 0) {
    throw "The desktop release publish failed with exit code $LASTEXITCODE."
  }
}
finally {
  Remove-Item Env:TAURI_SIGNING_PRIVATE_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD -ErrorAction SilentlyContinue
}
