# Start vite with error logging
$ErrorActionPreference = "Continue"

$logFile = "vite-startup.log"
Write-Host "Starting Vite and logging to $logFile..."

$viteProc = Start-Process -FilePath "node" -ArgumentList "node_modules/vite/bin/vite.js","--port","5173" -WorkingDirectory (Get-Location) -PassThru -RedirectStandardOutput $logFile -RedirectStandardError "$logFile.err" -WindowStyle Hidden

Write-Host "Process ID: $($viteProc.Id)"
Start-Sleep -Seconds 10

# Check if still running
if ($viteProc.HasExited) {
    Write-Host "Vite exited with code: $($viteProc.ExitCode)" -ForegroundColor Red
    if (Test-Path $logFile) {
        Write-Host "`nStdout:" -ForegroundColor Yellow
        Get-Content $logFile | Select-Object -First 20
    }
    if (Test-Path "$logFile.err") {
        Write-Host "`nStderr:" -ForegroundColor Yellow
        Get-Content "$logFile.err" | Select-Object -First 20
    }
} else {
    Write-Host "Vite is running (PID: $($viteProc.Id))" -ForegroundColor Green

    # Check port
    Start-Sleep -Seconds 5
    $portCheck = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
    if ($portCheck) {
        Write-Host "Port 5173 is listening" -ForegroundColor Green
    } else {
        Write-Host "Port 5173 is NOT listening" -ForegroundColor Red
    }
}