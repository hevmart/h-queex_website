param(
    [int]$Port = 5500
)

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$escapedRoot = [Regex]::Escape($projectRoot)
$killed = 0

Get-CimInstance Win32_Process | Where-Object {
    ($_.Name -eq "python.exe" -or $_.Name -eq "pythonw.exe") -and
    $_.CommandLine -and
    (
        ($_.CommandLine -match "-m\s+http\.server\s+$Port\b" -and $_.CommandLine -match $escapedRoot) -or
        ($_.CommandLine -match "no_cache_server\.py" -and $_.CommandLine -match "--port\s+$Port\b" -and $_.CommandLine -match $escapedRoot)
    )
} | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force
    $killed++
}

Write-Output "Stopped $killed localhost server process(es) on port $Port."
