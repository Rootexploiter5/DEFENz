$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $rootDir) { $rootDir = (Get-Location).Path }

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "         DEFENx Autonomous On-Device EDR Orchestrator            " -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan

# 1. Locate Python
$pythonExe = Join-Path $rootDir "backend\.venv\Scripts\python.exe"
if (-not (Test-Path $pythonExe)) {
    Write-Host "[!] Virtual environment missing. Bootstrapping with uv..." -ForegroundColor Yellow
    $uvExe = Join-Path $env:USERPROFILE ".local\bin\uv.exe"
    if (Test-Path $uvExe) {
        & $uvExe venv (Join-Path $rootDir "backend\.venv") --python 3.11
        & $uvExe pip install --python $pythonExe -r (Join-Path $rootDir "backend\requirements.txt")
    } else {
        Write-Error "Python virtual environment not found and uv is not installed."
        exit 1
    }
}

# 2. Check Node modules
$nodeModules = Join-Path $rootDir "frontend\node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Host "[!] Installing frontend dependencies..." -ForegroundColor Yellow
    npm --prefix (Join-Path $rootDir "frontend") install
}

Write-Host "[*] Starting FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Cyan
$backendProc = Start-Process -FilePath $pythonExe `
    -ArgumentList "-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", "8000" `
    -WorkingDirectory $rootDir `
    -PassThru

Write-Host "[*] Starting Next.js Command Center on http://localhost:3000..." -ForegroundColor Cyan
$frontendProc = Start-Process -FilePath "npm.cmd" `
    -ArgumentList "--prefix", (Join-Path $rootDir "frontend"), "run", "dev" `
    -WorkingDirectory $rootDir `
    -PassThru

# 3. Check Go Agent (if compiled)
$agentProc = $null
$agentBinary = Join-Path $rootDir "agent\bin\defenx-agent.exe"
if (Test-Path $agentBinary) {
    Write-Host "[*] Starting DEFENx Telemetry Agent..." -ForegroundColor Cyan
    $agentProc = Start-Process -FilePath $agentBinary `
        -ArgumentList "--backend=localhost:8000" `
        -WorkingDirectory (Join-Path $rootDir "agent") `
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
} catch {
    Write-Host "`n[*] Interrupt caught." -ForegroundColor Yellow
} finally {
    Write-Host "[*] Terminating DEFENx processes..." -ForegroundColor Yellow
    if ($backendProc -and -not $backendProc.HasExited) {
        Stop-Process -Id $backendProc.Id -Force -ErrorAction SilentlyContinue
    }
    if ($frontendProc -and -not $frontendProc.HasExited) {
        Stop-Process -Id $frontendProc.Id -Force -ErrorAction SilentlyContinue
    }
    if ($agentProc -and -not $agentProc.HasExited) {
        Stop-Process -Id $agentProc.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host "[✓] All processes stopped cleanly." -ForegroundColor Green
}
