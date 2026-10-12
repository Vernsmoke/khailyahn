# Creates a portable Windows test package without credentials, database data, or dependencies.
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$target = Join-Path $projectRoot 'DOWNLOAD-Gym-Management-Hostinger.zip'
$prefix = 'Gym Management Hostinger/'
$excludedNames = @('DOWNLOAD-Gym-Management-Hostinger.zip','config.php')
$excludedDirectories = @('node_modules','test-runtime','.git')
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target }
$archive = [IO.Compression.ZipFile]::Open($target,[IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($file in Get-ChildItem -LiteralPath $projectRoot -File -Recurse -Force) {
    $relative = $file.FullName.Substring($projectRoot.Length + 1).Replace('\','/')
    $segments = $relative.Split('/')
    if ($excludedNames -contains $file.Name) { continue }
    if (@($segments | Where-Object { $excludedDirectories -contains $_ }).Count -gt 0) { continue }
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,$file.FullName,$prefix+$relative,[IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
} finally {
  $archive.Dispose()
}
Write-Output 'Portable Windows download package created.'
