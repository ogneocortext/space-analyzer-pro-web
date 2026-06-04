# PowerShell startup script for Space Analyzer Pro services - Fixed Version
# Starts all services and performs health checks

param(
    [switch]$SkipHealthCheck,
    [switch]$Verbose
)

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    Cyan = "Cyan"
    White = "White"
}

# Service ports
$FrontendPort = 5173
$BackendPort = 8080
$AIServicePort = 5000

# Log directory
$LogDir = "logs"
if (!(Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

Write-Host "Starting Space Analyzer Pro Services" -ForegroundColor $Colors.Blue
Write-Host "==================================" -ForegroundColor $Colors.Blue

# Function to check if port is in use
function Test-PortInUse {
    param([int]$Port)
    
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    }
    catch {
        return $false
    }
}

# Function to wait for service to be ready
function Wait-ServiceReady {
    param(
        [string]$Url,
        [string]$ServiceName,
        [int]$MaxAttempts = 30
    )
    
    Write-Host "Waiting for $ServiceName to be ready..." -ForegroundColor $Colors.Yellow
    
    $attempt = 1
    while ($attempt -le $MaxAttempts) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            Write-Host "$ServiceName is ready!" -ForegroundColor $Colors.Green
            return $true
        }
        catch {
            Write-Host "Attempt $attempt/$MaxAttempts..." -ForegroundColor $Colors.Yellow
            Start-Sleep 2
            $attempt++
        }
    }
    
    Write-Host "$ServiceName failed to start within timeout" -ForegroundColor $Colors.Red
    return $false
}

# Function to start service
function Start-ServiceProcess {
    param(
        [string]$Command,
        [string]$ServiceName,
        [string]$LogFile
    )
    
    Write-Host "Starting $ServiceName..." -ForegroundColor $Colors.Blue
    
    try {
        # Start process in background
        $process = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $Command -WindowStyle Hidden -PassThru
        
        # Write process ID to file
        $processId = $process.Id
        $processId | Out-File -FilePath "$LogDir\$ServiceName.pid" -Encoding UTF8
        
        # Give service a moment to start
        Start-Sleep 3
        
        # Check if process is still running
        if (Get-Process -Id $processId -ErrorAction SilentlyContinue) {
            Write-Host "$ServiceName started (PID: $processId)" -ForegroundColor $Colors.Green
            return $true
        }
        else {
            Write-Host "$ServiceName failed to start" -ForegroundColor $Colors.Red
            Write-Host "Check log: $LogFile" -ForegroundColor $Colors.Red
            return $false
        }
    }
    catch {
        Write-Host "Failed to start $ServiceName`: $($_.Exception.Message)" -ForegroundColor $Colors.Red
        return $false
    }
}

# Function to stop all services
function Stop-AllServices {
    Write-Host "`nStopping all services..." -ForegroundColor $Colors.Yellow
    
    $services = @("frontend", "backend", "ai-service")
    foreach ($service in $services) {
        $pidFile = "$LogDir\$service.pid"
        if (Test-Path $pidFile) {
            $processId = Get-Content $pidFile
            try {
                $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                if ($process) {
                    Write-Host "Stopping $service (PID: $processId)..." -ForegroundColor $Colors.Yellow
                    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                    Start-Sleep 2
                    # Force kill if still running
                    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                    if ($process) {
                        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                    }
                }
            }
            catch {
                Write-Host "Warning: Could not stop $service`: $($_.Exception.Message)" -ForegroundColor $Colors.Yellow
            }
            Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
        }
    }
    
    Write-Host "All services stopped" -ForegroundColor $Colors.Green
    exit 0
}

# Check if required ports are available
Write-Host "Checking port availability..." -ForegroundColor $Colors.Blue

$ports = @($FrontendPort, $BackendPort, $AIServicePort)
foreach ($port in $ports) {
    if (Test-PortInUse -Port $port) {
        Write-Host "Port $port is already in use" -ForegroundColor $Colors.Yellow
        Write-Host "Services may already be running" -ForegroundColor $Colors.Yellow
        
        $response = Read-Host "Do you want to stop existing services and continue? (y/N)"
        if ($response -eq 'y' -or $response -eq 'Y') {
            Write-Host "Stopping existing services..." -ForegroundColor $Colors.Yellow
            # Kill processes using the ports
            foreach ($p in $ports) {
                Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue | 
                    Where-Object { $_.State -eq 'Listen' } | 
                    ForEach-Object { 
                        try { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } catch { }
                    }
            }
            Start-Sleep 2
        }
        else {
            Write-Host "Please stop services using ports $FrontendPort, $BackendPort, $AIServicePort" -ForegroundColor $Colors.Red
            exit 1
        }
    }
}

# Check dependencies
Write-Host "Checking dependencies..." -ForegroundColor $Colors.Blue

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "Node.js: $nodeVersion" -ForegroundColor $Colors.Green
}
catch {
    Write-Host "Node.js is not installed" -ForegroundColor $Colors.Red
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Host "npm: $npmVersion" -ForegroundColor $Colors.Green
}
catch {
    Write-Host "npm is not installed" -ForegroundColor $Colors.Red
    exit 1
}

# Check Python
try {
    $pythonVersion = python --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Python: $pythonVersion" -ForegroundColor $Colors.Green
    }
    else {
        throw "Python not found"
    }
}
catch {
    Write-Host "Python 3 is not installed" -ForegroundColor $Colors.Red
    exit 1
}

Write-Host "Dependencies check passed" -ForegroundColor $Colors.Green

# Start services in order

# 1. Start Backend
Write-Host "`nStarting Backend Service" -ForegroundColor $Colors.Blue
$backendStarted = Start-ServiceProcess -Command "npm run server" -ServiceName "backend" -LogFile "$LogDir\backend.log"

if (-not $backendStarted) {
    Write-Host "Backend failed to start" -ForegroundColor $Colors.Red
    exit 1
}

# Wait for backend to be ready
if (-not $SkipHealthCheck) {
    $backendReady = Wait-ServiceReady -Url "http://localhost:$BackendPort/api/health" -ServiceName "Backend"
    if (-not $backendReady) {
        Write-Host "Backend health check failed" -ForegroundColor $Colors.Red
        Stop-AllServices
        exit 1
    }
}

# 2. Start AI Service
Write-Host "`nStarting AI Service" -ForegroundColor $Colors.Blue

# Check if virtual environment exists
$venvPath = "ai-service\venv"
if (!(Test-Path $venvPath)) {
    Write-Host "Setting up Python virtual environment..." -ForegroundColor $Colors.Yellow
    try {
        python -m venv $venvPath
    }
    catch {
        Write-Host "Failed to create virtual environment" -ForegroundColor $Colors.Red
    }
}

# Activate virtual environment and install dependencies
$aiServiceCommand = ""
if (Test-Path "$venvPath\Scripts\activate.ps1") {
    $aiServiceCommand = "powershell -ExecutionPolicy Bypass -Command `"cd ai-service; .\venv\Scripts\activate.ps1; python main.py`""
}
elseif (Test-Path "$venvPath\Scripts\activate.bat") {
    $aiServiceCommand = "cd ai-service && venv\Scripts\activate.bat && python main.py"
}
else {
    $aiServiceCommand = "cd ai-service && python main.py"
}

$aiServiceStarted = Start-ServiceProcess -Command $aiServiceCommand -ServiceName "ai-service" -LogFile "$LogDir\ai-service.log"

if (-not $aiServiceStarted) {
    Write-Host "AI service failed to start" -ForegroundColor $Colors.Red
    Write-Host "Continuing without AI service (some features may be limited)" -ForegroundColor $Colors.Yellow
}
else {
    # Wait for AI service to be ready
    if (-not $SkipHealthCheck) {
        $aiServiceReady = Wait-ServiceReady -Url "http://localhost:$AIServicePort/health" -ServiceName "AI Service"
        if (-not $aiServiceReady) {
            Write-Host "AI service health check failed" -ForegroundColor $Colors.Yellow
        }
    }
}

# 3. Start Frontend
Write-Host "`nStarting Frontend Service" -ForegroundColor $Colors.Blue
$frontendStarted = Start-ServiceProcess -Command "npm run dev" -ServiceName "frontend" -LogFile "$LogDir\frontend.log"

if (-not $frontendStarted) {
    Write-Host "Frontend failed to start" -ForegroundColor $Colors.Red
    Stop-AllServices
    exit 1
}

# Wait for frontend to be ready
if (-not $SkipHealthCheck) {
    $frontendReady = Wait-ServiceReady -Url "http://localhost:$FrontendPort" -ServiceName "Frontend"
    if (-not $frontendReady) {
        Write-Host "Frontend health check failed" -ForegroundColor $Colors.Red
        Stop-AllServices
        exit 1
    }
}

Write-Host "`nAll services started successfully!" -ForegroundColor $Colors.Green
Write-Host "==================================" -ForegroundColor $Colors.Green
Write-Host "Frontend:     http://localhost:$FrontendPort" -ForegroundColor $Colors.Green
Write-Host "Backend API:  http://localhost:$BackendPort" -ForegroundColor $Colors.Green
Write-Host "AI Service:    http://localhost:$AIServicePort" -ForegroundColor $Colors.Green
Write-Host "AI Docs:       http://localhost:$AIServicePort/docs" -ForegroundColor $Colors.Green
Write-Host "==================================" -ForegroundColor $Colors.Green
Write-Host "Logs available in: $LogDir\" -ForegroundColor $Colors.Blue
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor $Colors.Yellow

# Keep script running
try {
    while ($true) {
        Start-Sleep 10
        
        # Check if services are still running
        $servicesRunning = $true
        
        $services = @("frontend", "backend", "ai-service")
        foreach ($service in $services) {
            $pidFile = "$LogDir\$service.pid"
            if (Test-Path $pidFile) {
                $processId = Get-Content $pidFile
                try {
                    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                    if (-not $process) {
                        Write-Host "$service (PID: $processId) is no longer running" -ForegroundColor $Colors.Red
                        $servicesRunning = $false
                    }
                }
                catch {
                    Write-Host "$service PID file not found" -ForegroundColor $Colors.Red
                    $servicesRunning = $false
                }
            }
            else {
                Write-Host "$service PID file not found" -ForegroundColor $Colors.Red
                $servicesRunning = $false
            }
        }
        
        if (-not $servicesRunning) {
            Write-Host "One or more services stopped unexpectedly" -ForegroundColor $Colors.Red
            Stop-AllServices
        }
    }
}
catch {
    # Ctrl+C pressed
    Write-Host "`nStopping services..." -ForegroundColor $Colors.Yellow
    Stop-AllServices
}
