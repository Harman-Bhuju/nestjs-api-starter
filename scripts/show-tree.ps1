#  .\scripts\show-tree.ps1
$exclude = @("node_modules", "dist", ".git")

$projectRoot = Split-Path -Parent $PSScriptRoot

function Show-Tree {
    param (
        [string]$Path,
        [string]$Prefix = ""
    )

    $items = Get-ChildItem -Path $Path |
        Where-Object { $exclude -notcontains $_.Name }

    for ($i = 0; $i -lt $items.Count; $i++) {
        $item = $items[$i]
        $isLast = $i -eq ($items.Count - 1)

        if ($isLast) {
            $connector = "\-- "
            $nextPrefix = "$Prefix    "
        } else {
            $connector = "|-- "
            $nextPrefix = "$Prefix|   "
        }

        Write-Output "$Prefix$connector$($item.Name)"

        if ($item.PSIsContainer) {
            Show-Tree -Path $item.FullName -Prefix $nextPrefix
        }
    }
}

Show-Tree -Path $projectRoot