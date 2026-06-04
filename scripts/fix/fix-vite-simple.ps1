# Simple Vite Cache Fix Script
param([switch]$AutoStart)

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent().IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator))) {
    Write-Host "❌ This script requires administrator privileges" -ForegroundColor Red
    Write-Host "Please right-click and select 'Run as administrator'" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "🔧 Vite Cache Fix Script" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ViteCacheDir = Join-Path $ProjectRoot "node_modules\.vite"

Write-Host "📁 Project: $ProjectRoot" -ForegroundColor Gray
Write-Host "🗂️ Cache: $ViteCacheDir" -ForegroundColor Gray

# Kill Node processes
Write-Host "🔄 Stopping Node.js processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

# Remove Vite cache
Write-Host "🧹 Removing Vite cache..." -ForegroundColor Yellow
try {
    if (Test-Path $ViteCacheDir) {
        Remove-Item -Path $ViteCacheDir -Recurse -Force
        Write-Host "✅ Cache removed" -ForegroundColor Green
    }
    New-Item -Path $ViteCacheDir -ItemType Directory -Force | Out-Null
    Write-Host "✅ Fresh cache created" -ForegroundColor Green
} catch {
    Write-Host "❌ Cache removal failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Create clean Vite config
Write-Host "📝 Creating clean Vite config..." -ForegroundColor Yellow
$ConfigPath = Join-Path $ProjectRoot "config\vite.config.ts"
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

try {
    Set-Content -Path $ConfigPath -Value $ConfigContent -Encoding UTF8
    Write-Host "✅ Clean config created" -ForegroundColor Green
} catch {
    Write-Host "❌ Config creation failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "========================" -ForegroundColor Cyan
Write-Host "✅ Vite cache fix completed!" -ForegroundColor Green
Write-Host "🚀 Run: npm run dev" -ForegroundColor Green
Write-Host "========================" -ForegroundColor Cyan

if ($AutoStart) {
    Write-Host "🚀 Starting development server..." -ForegroundColor Yellow
    Set-Location $ProjectRoot
    Start-Process -FilePath "npm" -ArgumentList "run", "dev" -NoNewWindow
    Write-Host "✅ Server started at http://localhost:5173" -ForegroundColor Cyan
} else {
    $Response = Read-Host "Start dev server now? (y/n)"
    if ($Response -match '^y') {
        Set-Location $ProjectRoot
        Start-Process -FilePath "npm" -ArgumentList "run", "dev" -NoNewWindow
        Write-Host "✅ Server started" -ForegroundColor Green
    }
}