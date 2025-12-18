# Script untuk membuat backup terenkripsi dengan password
param(
    [string]$Password = "Mukmin061217"
)

$backupName = "tech-mini-backup-$(Get-Date -Format 'yyyy-MM-dd-HHmmss').zip"
$encryptedName = "tech-mini-backup-encrypted-$(Get-Date -Format 'yyyy-MM-dd-HHmmss').zip"
$sourceDir = "."
$excludeDirs = @("node_modules", ".next", ".vercel", ".git", "backup.ps1", "encrypt-backup.ps1", "*.zip", "*.7z")

Write-Host "Creating encrypted backup..." -ForegroundColor Green

# Create zip first
$tempZip = [System.IO.Path]::GetTempFileName() + ".zip"
Add-Type -AssemblyName System.IO.Compression.FileSystem

# Create zip file
[System.IO.Compression.ZipFile]::CreateFromDirectory($sourceDir, $tempZip, [System.IO.Compression.CompressionLevel]::Optimal, $false)

# Encrypt the zip file using AES
Add-Type -AssemblyName System.Security

$zipBytes = [System.IO.File]::ReadAllBytes($tempZip)
$passwordBytes = [System.Text.Encoding]::UTF8.GetBytes($Password)

# Create salt and IV
$salt = New-Object byte[] 16
$rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
$rng.GetBytes($salt)

$iv = New-Object byte[] 16
$rng.GetBytes($iv)

# Derive key from password
$key = New-Object System.Security.Cryptography.Rfc2898DeriveBytes($passwordBytes, $salt, 10000)
$aesKey = $key.GetBytes(32)
$aesIV = $iv

# Encrypt
$aes = New-Object System.Security.Cryptography.AesManaged
$aes.Key = $aesKey
$aes.IV = $aesIV
$aes.Mode = [System.Security.Cryptography.CipherMode]::CBC
$aes.Padding = [System.Security.Cryptography.PaddingMode]::PKCS7

$encryptor = $aes.CreateEncryptor()
$encryptedBytes = $encryptor.TransformFinalBlock($zipBytes, 0, $zipBytes.Length)

# Combine salt + IV + encrypted data
$finalBytes = $salt + $iv + $encryptedBytes

# Save encrypted file
[System.IO.File]::WriteAllBytes($encryptedName, $finalBytes)

# Cleanup
Remove-Item $tempZip -Force

Write-Host "Encrypted backup created: $encryptedName" -ForegroundColor Green
Write-Host "Password: $Password" -ForegroundColor Yellow
