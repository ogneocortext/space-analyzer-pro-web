# Vite Cache Fix PowerShell Script
# Resolves Vite cache permission issues and Vue parsing problems
# Requires administrator privileges

param(
    [switch]$Force,
    [switch]$NoPrompt
)

Write-Host "🔧 Vite Cache Fix Script" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent().IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator))) {
    Write-Host "❌ This script requires administrator privileges" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please right-click this file and select 'Run as administrator'" -ForegroundColor Yellow
    Write-Host "Or run: PowerShell -ExecutionPolicy Bypass -File fix-vite-cache.ps1" -ForegroundColor Yellow

    if (-NOT $NoPrompt) {
        Read-Host "Press Enter to exit"
    }
    exit 1
}

Write-Host "✅ Running with administrator privileges" -ForegroundColor Green
Write-Host ""

# Get project directory
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ViteCacheDir = Join-Path $ProjectRoot "node_modules\.vite"

Write-Host "🔧 Project root: $ProjectRoot" -ForegroundColor Cyan
Write-Host "🗂️ Vite cache directory: $ViteCacheDir" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill any running Node.js processes
Write-Host "🔄 Stopping any running Node.js processes..." -ForegroundColor Yellow
try {
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "✅ Node.js processes stopped" -ForegroundColor Green
} catch {
    Write-Host "ℹ️ No Node.js processes to stop" -ForegroundColor Gray
}

# Step 2: Remove Vite cache directory
Write-Host "🧹 Removing Vite cache directory..." -ForegroundColor Yellow
try {
    if (Test-Path $ViteCacheDir) {
        # Remove with force
        Remove-Item -Path $ViteCacheDir -Recurse -Force -ErrorAction Stop
        Write-Host "✅ Vite cache directory removed" -ForegroundColor Green
    } else {
        Write-Host "ℹ️ Vite cache directory doesn't exist" -ForegroundColor Gray
    }

    # Create fresh directory
    New-Item -Path $ViteCacheDir -ItemType Directory -Force | Out-Null
    Write-Host "✅ Fresh Vite cache directory created" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to remove Vite cache: $($_.Exception.Message)" -ForegroundColor Red
    if (-NOT $Force) {
        if (-NOT $NoPrompt) {
            Read-Host "Press Enter to continue anyway"
        }
    }
}

# Step 3: Fix file permissions
Write-Host "🔐 Fixing file permissions..." -ForegroundColor Yellow
try {
    # Take ownership of the project directory
    $Acl = Get-Acl $ProjectRoot
    $AccessRule = New-Object System.Security.AccessControl.FileSystemAccessRule("Users", "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
    $Acl.SetAccessRule($AccessRule)
    Set-Acl $ProjectRoot $Acl

    Write-Host "✅ File permissions fixed" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Could not fix file permissions: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Step 4: Create clean Vite configuration
Write-Host "📝 Creating clean Vite configuration..." -ForegroundColor Yellow
try {
    $ConfigContent = @"
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig({
  plugins: [vue()],

  resolve: {
    alias: {
      "@": resolve(process.cwd(), "src"),
    },
  },

  server: {
    port: 5173,
    strictPort: false,
    host: true,
    open: false,
    cors: true,
  },

  build: {
    outDir: "dist",
    sourcemap: false,
  },

  optimizeDeps: {
    force: true,
    include: ["vue"],
  },
});
"@

    $ConfigPath = Join-Path $ProjectRoot "config\vite.config.ts"
    Set-Content -Path $ConfigPath -Value $ConfigContent -Encoding UTF8
    Write-Host "✅ Clean Vite configuration created" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create Vite configuration: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================" -ForegroundColor Cyan
Write-Host "✅ Vite cache fix completed successfully!" -ForegroundColor Green
Write-Host "🚀 You can now run: npm run dev" -ForegroundColor Green
Write-Host "========================" -ForegroundColor Cyan

# Ask if user wants to start development server
if (-NOT $NoPrompt) {
    Write-Host ""
    $Response = Read-Host "Would you like to start the development server now? (y/n)"

    if ($Response -match '^y') {
        Write-Host "🚀 Starting development server..." -ForegroundColor Yellow

        # Change to project directory and start Vite
        Set-Location $ProjectRoot
        Start-Process -FilePath "npm" -ArgumentList "run", "dev" -NoNewWindow

        Write-Host "✅ Development server started in background" -ForegroundColor Green
        Write-Host "🌐 Check your browser for http://localhost:5173" -ForegroundColor Cyan
    }
}

if (-NOT $NoPrompt) {
    Write-Host ""
    Read-Host "Press Enter to exit"
}
