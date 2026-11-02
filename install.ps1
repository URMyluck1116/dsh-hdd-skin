$ErrorActionPreference = "Stop"

$dest = "C:\Users\Public\dsh-wallpaper"
New-Item -ItemType Directory -Force -Path (Join-Path $dest "lib") | Out-Null

Copy-Item (Join-Path $PSScriptRoot "lib\client.js") (Join-Path $dest "lib\client.js") -Force
Copy-Item (Join-Path $PSScriptRoot "lib\index.js") (Join-Path $dest "lib\index.js") -Force

foreach ($name in @("boot-server.mjs", "boot-server.vbs")) {
  $source = Join-Path $PSScriptRoot $name
  if (Test-Path $source) { Copy-Item $source (Join-Path $dest $name) -Force }
}

foreach ($video in @("boot-new.mp4", "boot.mp4")) {
  $packagedVideo = Join-Path $PSScriptRoot $video
  if (Test-Path $packagedVideo) {
    Copy-Item $packagedVideo (Join-Path $dest $video) -Force
    Write-Host ("copied bundled " + $video)
  }
}

$profileDir = Join-Path $env:USERPROFILE ".dsh\profiles\desktop"
$profileFile = Join-Path $profileDir "cordis.patch.yml"
New-Item -ItemType Directory -Force -Path $profileDir | Out-Null

$entry = @(
  "- insert:",
  "    - id: wallpaper",
  "      name: 'C:/Users/Public/dsh-wallpaper/lib/index.js'"
) -join "`r`n"

if (Test-Path $profileFile) {
  $text = Get-Content $profileFile -Raw
  if ($text -match "id:\s*wallpaper") {
    Write-Host "wallpaper entry already exists in cordis.patch.yml"
  } else {
    Copy-Item $profileFile ($profileFile + ".bak") -Force
    if (-not $text.EndsWith("`n")) { $text += "`r`n" }
    Set-Content -Path $profileFile -Value ($text + "`r`n" + $entry + "`r`n") -Encoding UTF8 -NoNewline
    Write-Host "appended wallpaper entry to cordis.patch.yml (backup: cordis.patch.yml.bak)"
  }
} else {
  Set-Content -Path $profileFile -Value ($entry + "`r`n") -Encoding UTF8 -NoNewline
  Write-Host "created cordis.patch.yml with wallpaper entry"
}

$runKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
$vbs = Join-Path $dest "boot-server.vbs"
Set-ItemProperty -Path $runKey -Name "DSHBootVideo" -Value ('wscript.exe "' + $vbs + '"')
Write-Host "registered logon autostart: DSHBootVideo"

if (Test-Path (Join-Path $dest "boot.mp4")) {
  Start-Process "wscript.exe" -ArgumentList ('"' + $vbs + '"')
  Write-Host "started boot video server on 127.0.0.1:18766"
} else {
  Write-Host "boot.mp4 not found - boot animation will be skipped (copy it into $dest to enable it)"
}

Write-Host ""
Write-Host "Done. Restart DeepSeek Harness to load the wallpaper plugin."
