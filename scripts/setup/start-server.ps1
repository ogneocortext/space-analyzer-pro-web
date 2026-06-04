# Quick Start Script for Space Analyzer Backend
# Run this in PowerShell

$nodePath = "C:\nvm4w\nodejs"
$serverPath = "E:\Self Built Web and Mobile Apps\Space Analyzer\server\server.js"

Write-Host "Starting Space Analyzer Backend..." -ForegroundColor Cyan

# Run the server
& $nodePath $serverPath