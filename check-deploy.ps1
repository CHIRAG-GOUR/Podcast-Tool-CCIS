# check-deploy.ps1 - Deployment Status Checker

Write-Host "======================================" -ForegroundColor Cyan
Write-Host " Checking Firebase Deployment Status  " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$hostingUrl = "https://skillizee-products.web.app"
$cloudRunUrl = "https://skillizee-video-backend-1011375873388.us-central1.run.app"

# 1. Check Hosting Frontend
Write-Host "[1/3] Frontend Hosting ($hostingUrl)... " -NoNewline
try {
    $res = Invoke-WebRequest -Uri $hostingUrl -Method Head -UseBasicParsing -TimeoutSec 10
    Write-Host "ONLINE ($($res.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "OFFLINE/ERROR ($($_.Exception.Message))" -ForegroundColor Red
}

# 2. Check Backend Cloud Run
Write-Host "[2/3] Backend Service ($cloudRunUrl)... " -NoNewline
try {
    $res = Invoke-WebRequest -Uri "$cloudRunUrl/health" -Method Get -UseBasicParsing -TimeoutSec 10
    Write-Host "ONLINE ($($res.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "REACHABLE ($($_.Exception.Message))" -ForegroundColor Yellow
}

# 3. Test Signed Upload URL Endpoint (/api/video/upload-url)
Write-Host "[3/3] Signed Upload URL API (/api/video/upload-url)... " -NoNewline
try {
    $apiUrl = "$hostingUrl/api/video/upload-url"
    $body = @{ filename = "status_check.mp4"; contentType = "video/mp4" } | ConvertTo-Json
    $headers = @{ "Authorization" = "Bearer podcast_secure_v1_987654321" }
    $res = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $body -ContentType "application/json" -Headers $headers -TimeoutSec 15
    if ($res.url) {
        Write-Host "SUCCESS (Signed URL generated)" -ForegroundColor Green
    } else {
        Write-Host "FAILED ($($res | ConvertTo-Json))" -ForegroundColor Red
    }
} catch {
    Write-Host "FAILED ($($_.Exception.Message))" -ForegroundColor Red
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
