$ErrorActionPreference = "Stop"
$p = Join-Path $env:USERPROFILE ".dsh\profiles\desktop\cordis.patch.yml"

$lines = Get-Content -LiteralPath $p -Encoding UTF8
$clean = New-Object System.Collections.ArrayList

foreach ($line in $lines) {
  if ($line -match '^n- insert:') { continue }
  if ($line -match '^n\s') { continue }
  [void]$clean.Add($line)
}

while ($clean.Count -gt 0 -and $clean[$clean.Count - 1].Trim() -eq '') {
  $clean.RemoveAt($clean.Count - 1)
}

[void]$clean.Add('')
[void]$clean.Add('- insert:')
[void]$clean.Add('    - id: wallpaper')
[void]$clean.Add("      name: 'C:/Users/Public/dsh-wallpaper/lib/index.js'")

Set-Content -LiteralPath $p -Value $clean -Encoding UTF8
Write-Output "fixed"
Get-Content -LiteralPath $p -Tail 8
