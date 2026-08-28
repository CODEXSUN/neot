$ErrorActionPreference = "Stop"

function Assert-File([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "A required desktop release file is missing: $Path"
  }
}

function Assert-Equal($Actual, $Expected, [string]$Label) {
  if ($Actual -ne $Expected) {
    throw "The $Label is '$Actual'; expected '$Expected'."
  }
}

function Read-MsiProperty([string]$Path, [string]$Property) {
  $windowsInstaller = New-Object -ComObject WindowsInstaller.Installer
  $database = $windowsInstaller.GetType().InvokeMember(
    "OpenDatabase",
    "InvokeMethod",
    $null,
    $windowsInstaller,
    @($Path, 0)
  )
  $query = "SELECT ``Value`` FROM ``Property`` WHERE ``Property``='$Property'"
  $view = $database.GetType().InvokeMember("OpenView", "InvokeMethod", $null, $database, @($query))
  $view.GetType().InvokeMember("Execute", "InvokeMethod", $null, $view, $null) | Out-Null
  $record = $view.GetType().InvokeMember("Fetch", "InvokeMethod", $null, $view, $null)
  $value = $record.GetType().InvokeMember("StringData", "GetProperty", $null, $record, 1)
  $view.GetType().InvokeMember("Close", "InvokeMethod", $null, $view, $null) | Out-Null
  return $value
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$package = Get-Content -Raw (Join-Path $root "package.json") | ConvertFrom-Json
$version = $package.version
$releaseRoot = Join-Path $root "dist\deploy\desktop\$version\windows-x64"
$installerName = "NEOT_${version}_x64_en-US.msi"
$setupName = "NEOT_Setup_${version}_x64.exe"
$installerPath = Join-Path $releaseRoot "installer\$installerName"
$setupPath = Join-Path $releaseRoot "installer\$setupName"

Assert-File $installerPath
Assert-File "$installerPath.sig"
Assert-File $setupPath
Assert-File (Join-Path $releaseRoot "updater\latest.json")
Assert-File (Join-Path $releaseRoot "release.json")

$installer = Get-Item -LiteralPath $installerPath
$setup = Get-Item -LiteralPath $setupPath
if ($setup.Length -le $installer.Length) {
  throw "The setup EXE does not contain the MSI payload."
}
if ((Get-ChildItem -Recurse -File $releaseRoot -Filter "*.pdb").Count -ne 0) {
  throw "The desktop release contains a debug-symbol file."
}

Assert-Equal $setup.VersionInfo.CompanyName "CODEXSUN" "setup company"
Assert-Equal $setup.VersionInfo.FileDescription "NEOT Setup" "setup description"
Assert-Equal $setup.VersionInfo.FileVersion $version "setup file version"
Assert-Equal $setup.VersionInfo.ProductName "NEOT" "setup product"
Assert-Equal $setup.VersionInfo.ProductVersion $version "setup product version"

Assert-Equal (Read-MsiProperty $installerPath "ProductName") "NEOT" "MSI product"
Assert-Equal (Read-MsiProperty $installerPath "ProductVersion") $version "MSI version"
Assert-Equal (Read-MsiProperty $installerPath "Manufacturer") "CODEXSUN" "MSI manufacturer"
Assert-Equal `
  (Read-MsiProperty $installerPath "UpgradeCode") `
  "{DA54F106-F843-506E-8738-3BB49BDA90D2}" `
  "MSI upgrade code"

$updater = Get-Content -Raw (Join-Path $releaseRoot "updater\latest.json") | ConvertFrom-Json
$platform = $updater.platforms."windows-x86_64"
$expectedUrl = "https://github.com/CODEXSUN/neot/releases/download/desktop-v$version/$installerName"
Assert-Equal $updater.version $version "updater version"
Assert-Equal $platform.url $expectedUrl "updater URL"
if ([string]::IsNullOrWhiteSpace($platform.signature)) {
  throw "The updater signature is empty."
}

$manifest = Get-Content -Raw (Join-Path $releaseRoot "release.json") | ConvertFrom-Json
$roles = @($manifest.files.role)
foreach ($role in @("installer", "first-install-launcher", "updater-signature", "updater-manifest")) {
  if ($role -notin $roles) {
    throw "The release manifest is missing the $role role."
  }
}

Write-Output "Desktop release check passed for NEOT $version."
