# Rebuild upload archives from this project's source. Never includes config.php or test data.
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
function Make-Zip($name, $directory, $prefix, $excludeConfig) {
 $target = Join-Path $projectRoot $name
 if ([IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($target)) -ne $projectRoot) { throw 'Unsafe archive target' }
 if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target }
 $archive=[IO.Compression.ZipFile]::Open($target,[IO.Compression.ZipArchiveMode]::Create)
 try {
  $root=[IO.Path]::GetFullPath($directory)
  foreach($file in Get-ChildItem -LiteralPath $root -File -Recurse -Force){
   if($excludeConfig -and $file.Name -eq 'config.php'){continue}
   $relative=$file.FullName.Substring($root.Length+1).Replace('\','/')
   [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,$file.FullName,$prefix+$relative,[IO.Compression.CompressionLevel]::Optimal)|Out-Null
  }
 } finally { $archive.Dispose() }
}
Make-Zip 'UPLOAD-public_html.zip' (Join-Path $projectRoot 'public_html') '' $false
Make-Zip 'UPLOAD-gym-private.zip' (Join-Path $projectRoot 'server') 'gym-private/' $true
Write-Output 'Upload archives created. Private config and test data excluded.'

