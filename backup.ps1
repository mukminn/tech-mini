# Backup script dengan password protection
$password = "Mukmin061217"
$backupName = "tech-mini-backup-$(Get-Date -Format 'yyyy-MM-dd-HHmmss').zip"
$sourceDir = "."
$excludeDirs = @("node_modules", ".next", ".vercel", ".git", "backup.ps1")

Write-Host "Creating backup: $backupName" -ForegroundColor Green

# Create temporary directory for files to backup
$tempDir = New-TemporaryFile | ForEach-Object { Remove-Item $_; New-Item -ItemType Directory -Path $_ }

# Copy files excluding node_modules, .next, .vercel, .git
Get-ChildItem -Path $sourceDir -Recurse -File | Where-Object {
    $exclude = $false
    foreach ($excludeDir in $excludeDirs) {
        if ($_.FullName -like "*\$excludeDir\*") {
            $exclude = $true
            break
        }
    }
    -not $exclude
} | ForEach-Object {
    $relativePath = $_.FullName.Substring((Resolve-Path $sourceDir).Path.Length + 1)
    $destPath = Join-Path $tempDir $relativePath
    $destDir = Split-Path $destPath -Parent
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    Copy-Item $_.FullName -Destination $destPath -Force
}

# Create zip file
$zipPath = Join-Path (Get-Location) $backupName
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipPath -Force

# Cleanup temp directory
Remove-Item -Path $tempDir -Recurse -Force

Write-Host "Backup created: $backupName" -ForegroundColor Green
Write-Host "Note: This zip file is not password protected by default." -ForegroundColor Yellow
Write-Host "To add password protection, you need to use 7-Zip or WinRAR:" -ForegroundColor Yellow
Write-Host "  7z a -p$password -mhe=on $backupName-protected.7z $backupName" -ForegroundColor Cyan
