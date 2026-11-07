<#
.SYNOPSIS
    Single-command launcher for DEFENx: AI-Based Behavioral Anomaly Detection
.DESCRIPTION
    Bootstraps environments and launches the FastAPI backend, Next.js Command Center,
    and the Go Agent concurrently with unified logging and graceful termination.
#>

$ErrorActionPreference = "Stop"
$rootDir = $PSScriptRoot

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "         DEFENx Autonomous On-Device EDR Orchestrator            " -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan

# 1. Locate Python / UV
$pythonExe = "$rootDir\backend\.venv\Scripts\python.exe"
if (-not (Test-Path $pythonExe)) {
    Write-Host "[!] Virtual environment missing. Bootstrapping with uv..." -ForegroundColor Yellow
    $uvExe = "$HOME\.local\bin\uv.exe"
    if (Test-Path $uvExe) {
        & $uvExe venv "$rootDir\backend\.venv" --python 3.11
        & $uvExe pip install --python $pythonExe -r "$rootDir\backend\requirements.txt"
    } else {
        Write-Error "Python virtual environment not found and uv is not installed. Please set up backend\.venv."
    }
}

# 2. Check Node modules
if (-not (Test-Path "$rootDir\frontend\node_modules")) {
    Write-Host "[!] Installing frontend dependencies..." -ForegroundColor Yellow
    npm --prefix "$rootDir\frontend" install
}

Write-Host "[*] Starting FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Cyan
$backendProc = Start-Process -FilePath $pythonExe `
    -ArgumentList "-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", "8000" `
    -WorkingDirectory $rootDir `
    -PassThru

Write-Host "[*] Starting Next.js Command Center on http://localhost:3000..." -ForegroundColor Cyan
$frontendProc = Start-Process -FilePath "npm.cmd" `
    -ArgumentList "--prefix", "$rootDir\frontend", "run", "dev" `
    -WorkingDirectory $rootDir `
    -PassThru

# 3. Check Go Agent (if compiled)
$agentProc = $null
$agentBinary = "$rootDir\agent\bin\defenx-agent.exe"
if (Test-Path $agentBinary) {
    Write-Host "[*] Starting DEFENx Telemetry Agent..." -ForegroundColor Cyan
    $agentProc = Start-Process -FilePath $agentBinary `
        -ArgumentList "--backend=localhost:8000" `
        -WorkingDirectory "$rootDir\agent" `
        -PassThru
}

Write-Host "`n[✓] All DEFENx services are active!" -ForegroundColor Green
Write-Host "    - Command Center: http://localhost:3000" -ForegroundColor White
Write-Host "    - Backend API:    http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "`nPress Ctrl+C to stop all services..." -ForegroundColor DarkGray

try {
    while ($true) {
        Start-Sleep -Seconds 2
        if ($backendProc.HasExited -or $frontendProc.HasExited) {
            break
        }
    }
}
finally {
    Write-Host "`n[*] Terminating all DEFENx processes..." -ForegroundColor Yellow
    if ($backendProc -and -not $backendProc.HasExited) { Stop-Process -Id $backendProc.Id -Force -ErrorAction SilentlyContinue }
    if ($frontendProc -and -not $frontendProc.HasExited) { Stop-Process -Id $frontendProc.Id -Force -ErrorAction SilentlyContinue }
    if ($agentProc -and -not $agentProc.HasExited) { Stop-Process -Id $agentProc.Id -Force -ErrorAction SilentlyContinue }
    Write-Host "[✓] Shutdown clean." -ForegroundColor Green
}

