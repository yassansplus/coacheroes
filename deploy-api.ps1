param(
  [switch]$Check,
  [switch]$Tests
)

$ErrorActionPreference = 'Stop'
$scriptPath = Join-Path $PSScriptRoot 'scripts\deploy-api.sh'
if (-not (Get-Command wsl.exe -ErrorAction SilentlyContinue)) {
  throw 'WSL est requis pour lancer ce script depuis PowerShell.'
}
$linuxPath = (& wsl.exe --exec wslpath -a $scriptPath).Trim()
if ($LASTEXITCODE -ne 0 -or -not $linuxPath) {
  throw 'Impossible de convertir le chemin du script pour WSL.'
}
$arguments = @($linuxPath)
if ($Check) { $arguments += '--check' }
if ($Tests) { $arguments += '--tests' }
& wsl.exe --exec bash @arguments
exit $LASTEXITCODE
