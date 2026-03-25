# Etest: pull base images from China mirror then build (no Docker Desktop config needed)
# Run in Etest folder: .\build.ps1

# Do not stop on docker stderr
$ErrorActionPreference = "Continue"
$MIRRORS = @(
    "docker.m.daocloud.io",
    "docker.mirrors.sjtug.sjtu.edu.cn",
    "docker.xuanyuan.me",
    "docker.mirrors.ustc.edu.cn",
    "hub-mirror.c.163.com"
)

function Pull-FromMirror {
    param([string]$Image, [string]$Tag)
    $full = "${Image}:${Tag}"
    # 本地已有则跳过，不重复拉取
    $exists = & docker image inspect $full 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Skip (already have): $full"
        return $true
    }
    foreach ($m in $MIRRORS) {
        $mirrorFull = "${m}/library/${Image}:${Tag}"
        Write-Host "Pull: $mirrorFull"
        $null = & docker pull $mirrorFull 2>&1
        if ($LASTEXITCODE -eq 0) {
            & docker tag $mirrorFull $full 2>&1 | Out-Null
            Write-Host "OK: $full"
            return $true
        }
    }
    Write-Host "Mirrors failed, pull direct: $full"
    & docker pull $full 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Pull failed: $full" }
    return $true
}

Set-Location $PSScriptRoot

Write-Host ""
Write-Host "=== Step 1: Pull base images from mirror ==="
Pull-FromMirror -Image "node"   -Tag "20-slim" | Out-Null
Pull-FromMirror -Image "python" -Tag "3.11-slim" | Out-Null

Write-Host ""
Write-Host "=== Step 2: Build and start ==="
& docker compose up -d --build
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "Done."
