Remove-Item -Recurse -Force '.next\cache' -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force '.firebase\skillizee-products\functions\.next\cache' -ErrorAction SilentlyContinue
Write-Host 'Cache cleaned! Starting deploy...' -ForegroundColor Green
firebase deploy
