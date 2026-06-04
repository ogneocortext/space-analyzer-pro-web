# Test appropriate models for Space Analyzer
# File analysis requires reasoning, structure understanding, and technical analysis

$models = @(
    @{ Name = "phi4-mini:latest"; Desc = "General analysis - Fastest"; SizeGB = 2.4 },
    @{ Name = "gemma3:4b"; Desc = "Structured analysis"; SizeGB = 3.1 },
    @{ Name = "qwen2.5-coder:7b-instruct"; Desc = "Code/file specialist"; SizeGB = 4.5 },
    @{ Name = "deepseek-coder:6.7b-instruct"; Desc = "Technical analysis"; SizeGB = 3.6 }
)

# Test prompt that matches Space Analyzer's actual use case
$testPrompt = @"
You are a file system analyzer. Analyze this directory:

Path: C:\Users\Developer\Projects
Total Files: 15,432
Total Size: 45.2 GB
Categories:
- Code files: 8,500 (23 GB) - .js, .ts, .py
- Dependencies: 4,200 (18 GB) - node_modules, .venv
- Media: 1,200 (3.5 GB) - .png, .jpg
- Documents: 800 (350 MB) - .md, .pdf
- Other: 732 (350 MB)

Top 5 largest files:
1. node_modules\bundle.js - 2.1 GB
2. assets\video.mp4 - 1.8 GB
3. backup\data.sql - 890 MB
4. build\output.js - 450 MB
5. temp\cache.bin - 320 MB

Provide:
1. Storage efficiency assessment
2. Cleanup recommendations
3. Redundancy detection (possible duplicates)
4. Optimization suggestions
5. Security concerns

Be concise but thorough.
"@

Write-Host "`n🧪 Testing Models for Space Analyzer Context`n" -ForegroundColor Cyan
Write-Host "Test Prompt: File system analysis with storage recommendations`n" -ForegroundColor Gray

$results = @()

foreach ($model in $models) {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "Testing: $($model.Name)" -ForegroundColor Yellow
    Write-Host "Purpose: $($model.Desc)" -ForegroundColor Gray
    Write-Host "VRAM: $($model.SizeGB) GB" -ForegroundColor Gray
    Write-Host ""

    $body = @{
        model = $model.Name
        prompt = $testPrompt
        stream = $false
        options = @{
            temperature = 0.3
            num_predict = 500
            thinking = $false  # Ollama 0.22.0 feature
            num_ctx = 8192
        }
    } | ConvertTo-Json -Depth 3

    $sw = [System.Diagnostics.Stopwatch]::StartNew()

    try {
        $response = Invoke-RestMethod `
            -Uri "http://localhost:8080/api/ollama/api/generate" `
            -Method POST `
            -Body $body `
            -ContentType "application/json" `
            -TimeoutSec 90

        $sw.Stop()
        $totalMs = $sw.ElapsedMilliseconds

        # Calculate metrics
        $genTimeMs = if ($response.total_duration) { [math]::Round($response.total_duration / 1e6) } else { $totalMs }
        $loadTimeMs = if ($response.load_duration) { [math]::Round($response.load_duration / 1e6) } else { 0 }
        $evalCount = $response.eval_count
        $evalDurationMs = if ($response.eval_duration) { [math]::Round($response.eval_duration / 1e6) } else { 0 }
        $tokensPerSec = if ($evalDurationMs -gt 0) { [math]::Round($evalCount / ($evalDurationMs / 1000), 1) } else { 0 }

        # Truncate response for display
        $responseText = $response.response
        if ($responseText.Length -gt 300) {
            $responseText = $responseText.Substring(0, 300) + "..."
        }

        Write-Host "✅ SUCCESS" -ForegroundColor Green
        Write-Host "Total Time: ${totalMs}ms" -ForegroundColor Cyan
        Write-Host "Load Time: ${loadTimeMs}ms" -ForegroundColor Gray
        Write-Host "Gen Time: ${genTimeMs}ms" -ForegroundColor Gray
        Write-Host "Tokens: $evalCount (${tokensPerSec} tok/s)" -ForegroundColor Gray
        Write-Host "Done Reason: $($response.done_reason)" -ForegroundColor Gray

        if ($response.thinking) {
            Write-Host "Thinking: Present (0.22.0 feature)" -ForegroundColor Magenta
        }

        Write-Host "`nResponse Preview:" -ForegroundColor DarkGray
        Write-Host $responseText -ForegroundColor White

        $results += [PSCustomObject]@{
            Model = $model.Name
            Description = $model.Desc
            SizeGB = $model.SizeGB
            TotalMs = $totalMs
            LoadMs = $loadTimeMs
            GenMs = $genTimeMs
            Tokens = $evalCount
            TokensPerSec = $tokensPerSec
            Status = "Success"
            ResponseLength = $response.response.Length
            HasThinking = [bool]$response.thinking
        }

    } catch {
        $sw.Stop()
        Write-Host "❌ FAILED" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red

        $results += [PSCustomObject]@{
            Model = $model.Name
            Description = $model.Desc
            SizeGB = $model.SizeGB
            TotalMs = $sw.ElapsedMilliseconds
            LoadMs = 0
            GenMs = 0
            Tokens = 0
            TokensPerSec = 0
            Status = "Failed: $($_.Exception.Message)"
            ResponseLength = 0
            HasThinking = $false
        }
    }

    Write-Host ""
    Start-Sleep -Seconds 2  # Cool down between tests
}

# Summary
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "📊 PERFORMANCE COMPARISON" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

$results | Format-Table -Property `
    @{N="Model"; E={$_.Model}; Width=30}, `
    @{N="Time"; E={"$($_.TotalMs)ms"}; Width=10}, `
    @{N="Load"; E={"$($_.LoadMs)ms"}; Width=10}, `
    @{N="Tok/s"; E={$_.TokensPerSec}; Width=8}, `
    @{N="Status"; E={
        if ($_.Status -eq "Success") { "✅ " + $_.Status }
        else { "❌ " + ($_.Status -replace "Failed: ", "").Substring(0, [Math]::Min(30, ($_.Status -replace "Failed: ", "").Length)) }
    }; Width=35}

Write-Host "`n🏆 RECOMMENDATION:" -ForegroundColor Green
$successful = $results | Where-Object { $_.Status -eq "Success" }
if ($successful) {
    $best = $successful | Sort-Object TotalMs | Select-Object -First 1
    Write-Host "Best for Space Analyzer: $($best.Model)" -ForegroundColor Yellow
    Write-Host "  - Total Time: $($best.TotalMs)ms" -ForegroundColor Gray
    Write-Host "  - Speed: $($best.TokensPerSec) tokens/sec" -ForegroundColor Gray
    Write-Host "  - VRAM: $($best.SizeGB) GB" -ForegroundColor Gray

    if ($best.HasThinking) {
        Write-Host "  - ✅ Supports Ollama 0.22.0 'thinking' feature" -ForegroundColor Green
    }
}
