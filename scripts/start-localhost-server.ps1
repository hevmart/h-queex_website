param(
    [int]$Port = 5500,
    [switch]$OpenBrowser
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

# Keep startup idempotent: if something is already listening on the port, do not start another server.
$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listener) {
    if ($OpenBrowser) {
        Start-Process "http://localhost:$Port/"
    }
    exit 0
}

if ($OpenBrowser) {
    Start-Process "http://localhost:$Port/local-access.html"
}

Set-Location $projectRoot
py "$PSScriptRoot\no_cache_server.py" --port $Port --directory $projectRoot
